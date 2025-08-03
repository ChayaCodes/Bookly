'use server';

/**
 * @fileOverview This file defines a Genkit flow for automatically extracting and generating book metadata.
 *
 * It includes:
 * - generateBookMetadata: A function to extract and generate book metadata.
 * - GenerateBookMetadataInput: The input type for the generateBookMetadata function.
 * - GenerateBookMetadataOutput: The output type for the generateBookMetadata function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateBookMetadataInputSchema = z.object({
  bookText: z
    .string()
    .describe('The text content of the book to extract metadata from.'),
});
export type GenerateBookMetadataInput = z.infer<typeof GenerateBookMetadataInputSchema>;

const GenerateBookMetadataOutputSchema = z.object({
  title: z.string().describe('The title of the book.'),
  author: z.string().describe('The author of the book.'),
  description: z.string().describe('A short description of the book.'),
  tags: z.array(z.string()).describe('Relevant tags for the book.'),
  language: z.string().describe('The primary language of the book (e.g., "English", "Hebrew").'),
  'data-ai-hint': z.string().describe('One or two keywords to hint at the cover image style. e.g., "science fiction" or "historical drama".')
});
export type GenerateBookMetadataOutput = z.infer<typeof GenerateBookMetadataOutputSchema>;

export async function generateBookMetadata(input: GenerateBookMetadataInput): Promise<GenerateBookMetadataOutput> {
  return generateBookMetadataFlow(input);
}

const generateBookMetadataPrompt = ai.definePrompt({
  name: 'generateBookMetadataPrompt',
  input: {schema: GenerateBookMetadataInputSchema},
  output: {schema: GenerateBookMetadataOutputSchema},
  prompt: `You are an expert in book metadata extraction. Given the text content of a book, extract or generate the following metadata:

- Title
- Author
- The primary language of the book (e.g., "English", "Hebrew", "French").
- A short, compelling description (around 3-4 sentences)
- A list of relevant tags or genres
- A short (one or two word) hint for an AI image generator to create a cover image. Examples: "space opera", "fantasy landscape", "noir detective", "coming-of-age".

Book Content (first 15000 characters):
{{{bookText}}}

Output the metadata in JSON format.`, 
});

const generateBookMetadataFlow = ai.defineFlow(
  {
    name: 'generateBookMetadataFlow',
    inputSchema: GenerateBookMetadataInputSchema,
    outputSchema: GenerateBookMetadataOutputSchema,
  },
  async input => {
    const {output} = await generateBookMetadataPrompt(input);
    return output!;
  }
);
