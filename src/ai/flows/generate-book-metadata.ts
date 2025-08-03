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
import {z} from 'genkit';

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
});
export type GenerateBookMetadataOutput = z.infer<typeof GenerateBookMetadataOutputSchema>;

export async function generateBookMetadata(input: GenerateBookMetadataInput): Promise<GenerateBookMetadataOutput> {
  return generateBookMetadataFlow(input);
}

const generateBookMetadataPrompt = ai.definePrompt({
  name: 'generateBookMetadataPrompt',
  input: {schema: GenerateBookMetadataInputSchema},
  output: {schema: GenerateBookMetadataOutputSchema},
  prompt: `You are an expert in book metadata extraction. Given the text content of a book, extract the following metadata:

- Title
- Author
- Description
- Tags

Book Content:
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
