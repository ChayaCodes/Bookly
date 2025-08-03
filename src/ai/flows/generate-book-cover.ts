'use server';

/**
 * @fileOverview A Genkit flow for generating a book cover image.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

const GenerateBookCoverInputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  description: z.string().describe('A short description of the book.'),
  'data-ai-hint': z.string().optional().describe('Optional keywords to guide the image generation.'),
});
export type GenerateBookCoverInput = z.infer<typeof GenerateBookCoverInputSchema>;

const GenerateBookCoverOutputSchema = z.object({
  coverImage: z.string().describe("The generated cover image as a data URI."),
});
export type GenerateBookCoverOutput = z.infer<typeof GenerateBookCoverOutputSchema>;

export async function generateBookCover(input: GenerateBookCoverInput): Promise<GenerateBookCoverOutput> {
  return generateBookCoverFlow(input);
}

const generateBookCoverFlow = ai.defineFlow(
  {
    name: 'generateBookCoverFlow',
    inputSchema: GenerateBookCoverInputSchema,
    outputSchema: GenerateBookCoverOutputSchema,
  },
  async (input) => {
    const prompt = `Generate a visually appealing and marketable book cover.
    The cover should be for a book titled "${input.title}".
    
    Description of the book: "${input.description}".
    
    ${input['data-ai-hint'] ? `Use the following hint for the visual style: ${input['data-ai-hint']}` : ''}
    
    The cover should be clean, modern, and professional. Avoid adding any text to the image. Focus on a central, symbolic image that captures the essence of the book's description.`;

    const {media} = await ai.generate({
      model: googleAI.model('gemini-2.0-flash-preview-image-generation'),
      prompt: prompt,
      config: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    });
    
    if (!media || !media.url) {
        throw new Error('Image generation failed.');
    }

    return { coverImage: media.url };
  }
);
