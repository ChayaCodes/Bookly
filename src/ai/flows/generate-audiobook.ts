'use server';
/**
 * @fileOverview A Genkit flow for generating an audiobook from text content.
 * It splits the text into chapters and generates audio for each chapter.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { googleAI } from '@genkit-ai/googleai';
import wav from 'wav';
import { Readable } from 'stream';

// Helper to convert PCM audio buffer to WAV format as a Base64 string
async function toWav(
  pcmData: Buffer,
  channels = 1,
  rate = 24000,
  sampleWidth = 2
): Promise<string> {
  return new Promise((resolve, reject) => {
    const writer = new wav.Writer({
      channels,
      sampleRate: rate,
      bitDepth: sampleWidth * 8,
    });

    const bufs: Buffer[] = [];
    writer.on('error', reject);
    writer.on('data', (d) => {
      bufs.push(d);
    });
    writer.on('end', () => {
      resolve(Buffer.concat(bufs).toString('base64'));
    });

    const readable = new Readable();
    readable.push(pcmData);
    readable.push(null); // Signal end of data

    readable.pipe(writer);
  });
}


const GenerateAudiobookInputSchema = z.object({
  bookContent: z.string().describe('The text content of the book to be converted to an audiobook.'),
});
export type GenerateAudiobookInput = z.infer<typeof GenerateAudiobookInputSchema>;

const ChapterSchema = z.object({
  title: z.string().describe('The title of the chapter.'),
  audioDataUri: z.string().describe("The chapter's audio content as a data URI."),
});

const GenerateAudiobookOutputSchema = z.object({
  chapters: z.array(ChapterSchema).describe('An array of audiobook chapters.'),
});
export type GenerateAudiobookOutput = z.infer<typeof GenerateAudiobookOutputSchema>;


export async function generateAudiobook(input: GenerateAudiobookInput): Promise<GenerateAudiobookOutput> {
  return generateAudiobookFlow(input);
}


const CHUNK_SIZE = 4500; // Gemini has a 5000 character limit per TTS request

function splitIntoChapters(text: string): { title: string; content: string }[] {
    const chapters = [];
    let remainingText = text;
    let chapterIndex = 1;

    while (remainingText.length > 0) {
        const chunk = remainingText.slice(0, CHUNK_SIZE);
        chapters.push({
            title: `Chapter ${chapterIndex}`,
            content: chunk,
        });
        remainingText = remainingText.slice(CHUNK_SIZE);
        chapterIndex++;
    }
    return chapters;
}


const generateAudiobookFlow = ai.defineFlow(
  {
    name: 'generateAudiobookFlow',
    inputSchema: GenerateAudiobookInputSchema,
    outputSchema: GenerateAudiobookOutputSchema,
  },
  async (input) => {
    const textChapters = splitIntoChapters(input.bookContent);
    const audioChapters = [];
    
    for (const chapter of textChapters) {
        const { media } = await ai.generate({
            model: googleAI.model('gemini-2.5-flash-preview-tts'),
            config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Algenib' },
                    },
                },
            },
            prompt: chapter.content,
        });

        if (!media || !media.url) {
            throw new Error(`Failed to generate audio for ${chapter.title}`);
        }

        const pcmBuffer = Buffer.from(media.url.substring(media.url.indexOf(',') + 1), 'base64');
        const wavBase64 = await toWav(pcmBuffer);

        audioChapters.push({
            title: chapter.title,
            audioDataUri: `data:audio/wav;base64,${wavBase64}`,
        });
    }

    return { chapters: audioChapters };
  }
);
