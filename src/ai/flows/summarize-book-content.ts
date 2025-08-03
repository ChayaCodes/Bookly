'use server';

/**
 * @fileOverview A book content summarization AI agent.
 *
 * - summarizeBookContent - A function that handles the book summarization process.
 * - SummarizeBookContentInput - The input type for the summarizeBookContent function.
 * - SummarizeBookContentOutput - The return type for the summarizeBookContent function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeBookContentInputSchema = z.object({
  bookContent: z
    .string()
    .describe('The entire text content of the book to be summarized.'),
});
export type SummarizeBookContentInput = z.infer<typeof SummarizeBookContentInputSchema>;

const SummarizeBookContentOutputSchema = z.object({
  summary: z
    .string()
    .describe('A concise summary of the book content.'),
});
export type SummarizeBookContentOutput = z.infer<typeof SummarizeBookContentOutputSchema>;

export async function summarizeBookContent(input: SummarizeBookContentInput): Promise<SummarizeBookContentOutput> {
  return summarizeBookContentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeBookContentPrompt',
  input: {schema: SummarizeBookContentInputSchema},
  output: {schema: SummarizeBookContentOutputSchema},
  prompt: `You are a professional book summarizer. Please provide a concise summary of the following book content:\n\n{{{bookContent}}}`,
});

const summarizeBookContentFlow = ai.defineFlow(
  {
    name: 'summarizeBookContentFlow',
    inputSchema: SummarizeBookContentInputSchema,
    outputSchema: SummarizeBookContentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
