"use server";

import { generateBookMetadata, GenerateBookMetadataInput, GenerateBookMetadataOutput } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent, SummarizeBookContentInput, SummarizeBookContentOutput } from '@/ai/flows/summarize-book-content';
import { generateAudiobook, GenerateAudiobookInput, GenerateAudiobookOutput } from '@/ai/flows/generate-audiobook';
import { generateBookCover, GenerateBookCoverInput } from '@/ai/flows/generate-book-cover';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { ref, getBlob } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Book } from '@/lib/types';

const metadataSchema = z.object({
  bookId: z.string().min(1, "Book ID is required."),
  storagePath: z.string().min(1, "Storage path is required."),
});

async function getTextContentFromStorage(storagePath: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    const blob = await getBlob(fileRef);
    // This is a placeholder for actual text extraction from PDF/EPUB on the server.
    // In a real app, you'd use libraries like pdf-parse or epubjs on the server.
    // For now, we are just returning a placeholder text as parsing is complex.
    try {
        const text = await blob.text();
        return text;
    } catch (e) {
        console.warn(`Could not read ${storagePath} as text. This is expected for binary files like PDF or EPUB. Returning placeholder content.`);
        return "This document is in a format that cannot be displayed as plain text. Summary and other features will be based on available metadata.";
    }
}


export async function generateMetadataAction(input: {bookId: string, storagePath: string}): Promise<{ data: GenerateBookMetadataOutput | null, error: string | null }> {
  const validation = metadataSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: validation.error.errors.map(e => e.message).join(', ') };
  }
  try {
    const bookDocRef = doc(db, "books", input.bookId);
    
    // 1. Generate Metadata
    const bookText = await getTextContentFromStorage(input.storagePath);
    const metadata = await generateBookMetadata({ bookText: bookText.slice(0, 15000) });

    // 2. Update Firestore with new metadata
    const updatePayload: Partial<Book> = { ...metadata };
    await updateDoc(bookDocRef, updatePayload);

    // 3. Generate Cover Image (asynchronously, don't wait for it)
    generateBookCover({
        title: metadata.title,
        description: metadata.description,
        'data-ai-hint': metadata['data-ai-hint'],
    }).then(async (coverResult) => {
        if (coverResult.coverImage) {
            await updateDoc(bookDocRef, { coverImage: coverResult.coverImage });
        }
    }).catch(e => console.error("Cover generation failed:", e));


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
