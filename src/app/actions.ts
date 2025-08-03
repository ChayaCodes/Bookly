"use server";

import { generateBookMetadata, GenerateBookMetadataInput, GenerateBookMetadataOutput } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent, SummarizeBookContentInput, SummarizeBookContentOutput } from '@/ai/flows/summarize-book-content';
import { generateAudiobook, GenerateAudiobookInput, GenerateAudiobookOutput } from '@/ai/flows/generate-audiobook';
import { z } from 'zod';

const metadataSchema = z.object({
  bookText: z.string().min(100, "Book text must be at least 100 characters."),
});

export async function generateMetadataAction(input: GenerateBookMetadataInput): Promise<{ data: GenerateBookMetadataOutput | null, error: string | null }> {
  const validation = metadataSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  try {
    const metadata = await generateBookMetadata(input);
    return { data: metadata, error: null };
  } catch (e) {
    return { data: null, error: 'Failed to generate metadata. Please try again.' };
  }
}

const summarySchema = z.object({
  bookContent: z.string().min(100, "Book content must be at least 100 characters."),
});

export async function summarizeContentAction(input: SummarizeBookContentInput): Promise<{ data: SummarizeBookContentOutput | null, error: string | null }> {
    const validation = summarySchema.safeParse(input);
    if (!validation.success) {
        return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
    }
  try {
    const summary = await summarizeBookContent(input);
    return { data: summary, error: null };
  } catch (e) {
    return { data: null, error: 'Failed to generate summary. Please try again.' };
  }
}

const audiobookSchema = z.object({
  bookContent: z.string().min(100, "Book content must be at least 100 characters."),
});

export async function generateAudiobookAction(input: GenerateAudiobookInput): Promise<{ data: GenerateAudiobookOutput | null, error: string | null }> {
  const validation = audiobookSchema.safeParse(input);
  if (!validation.success) {
      return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  try {
    const audiobook = await generateAudiobook(input);
    return { data: audiobook, error: null };
  } catch (e: any) {
    console.error("Audiobook generation failed:", e);
    return { data: null, error: e.message || 'Failed to generate audiobook. Please try again.' };
  }
}
