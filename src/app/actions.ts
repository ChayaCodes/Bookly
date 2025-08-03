"use server";

import { generateBookMetadata, GenerateBookMetadataInput, GenerateBookMetadataOutput } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent, SummarizeBookContentInput, SummarizeBookContentOutput } from '@/ai/flows/summarize-book-content';
import { generateAudiobook, GenerateAudiobookInput, GenerateAudiobookOutput } from '@/ai/flows/generate-audiobook';
import { z } from 'zod';
import { storage } from '@/lib/firebase';
import { ref, getBlob } from 'firebase/storage';

const metadataSchema = z.object({
  storagePath: z.string().min(1, "Storage path is required."),
});

async function getTextContentFromStorage(storagePath: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    const blob = await getBlob(fileRef);
    return await blob.text();
}


export async function generateMetadataAction(input: {storagePath: string}): Promise<{ data: GenerateBookMetadataOutput | null, error: string | null }> {
  const validation = metadataSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  try {
    const bookText = await getTextContentFromStorage(input.storagePath);
    const metadata = await generateBookMetadata({ bookText: bookText.slice(0, 15000) });
    return { data: metadata, error: null };
  } catch (e) {
    console.error("Metadata generation failed:", e);
    return { data: null, error: 'Failed to generate metadata. Please try again.' };
  }
}

const summarySchema = z.object({
  storagePath: z.string().min(1, "Storage path is required."),
});

export async function summarizeContentAction(input: {storagePath: string}): Promise<{ data: SummarizeBookContentOutput | null, error: string | null }> {
    const validation = summarySchema.safeParse(input);
    if (!validation.success) {
        return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
    }
  try {
    const bookContent = await getTextContentFromStorage(input.storagePath);
    const summary = await summarizeBookContent({ bookContent });
    return { data: summary, error: null };
  } catch (e) {
    console.error("Summary generation failed:", e);
    return { data: null, error: 'Failed to generate summary. Please try again.' };
  }
}

const audiobookSchema = z.object({
  storagePath: z.string().min(1, "Book content is required."),
});

export async function generateAudiobookAction(input: {storagePath: string}): Promise<{ data: GenerateAudiobookOutput | null, error: string | null }> {
  const validation = audiobookSchema.safeParse(input);
  if (!validation.success) {
      return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  try {
    const bookContent = await getTextContentFromStorage(input.storagePath);
    const audiobook = await generateAudiobook({ bookContent });
    return { data: audiobook, error: null };
  } catch (e: any) {
    console.error("Audiobook generation failed:", e);
    return { data: null, error: e.message || 'Failed to generate audiobook. Please try again.' };
  }
}
