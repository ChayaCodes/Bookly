"use server";

import { generateBookMetadata, GenerateBookMetadataInput, GenerateBookMetadataOutput } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent, SummarizeBookContentInput, SummarizeBookContentOutput } from '@/ai/flows/summarize-book-content';
import { generateAudiobook, GenerateAudiobookInput, GenerateAudiobookOutput } from '@/ai/flows/generate-audiobook';
import { generateBookCover, GenerateBookCoverInput } from '@/ai/flows/generate-book-cover';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { ref, getBlob, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Book } from '@/lib/types';


const uploadSchema = z.object({
  bookId: z.string(),
  fileName: z.string(),
  fileDataUrl: z.string().refine(val => val.startsWith('data:'), "Invalid data URL format."),
});

export async function uploadBookAction(input: z.infer<typeof uploadSchema>): Promise<{ storagePath: string | null, error: string | null }> {
    const validation = uploadSchema.safeParse(input);
    if (!validation.success) {
        return { storagePath: null, error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    
    const { bookId, fileName, fileDataUrl } = validation.data;
    const storagePath = `books/${bookId}-${fileName}`;
    const storageRef = ref(storage, storagePath);

    try {
        await uploadString(storageRef, fileDataUrl, 'data_url');
        console.log("Upload successful for:", storagePath);
        return { storagePath: storagePath, error: null };
    } catch (e: any) {
        console.error("Server-side upload failed:", e);
        if (e.code === 'storage/unauthorized') {
            return { storagePath: null, error: "Upload failed: Permission denied. Your Firebase Storage security rules may not allow unauthenticated writes." };
        }
        if (e.code === 'storage/unknown') {
            return { storagePath: null, error: 'An unknown storage error occurred. This might be due to incorrect Firebase Storage setup or rules. Please ensure your rules allow unauthenticated writes if you do not have a login system.' };
        }
        return { storagePath: null, error: e.message || "An unknown error occurred during file upload." };
    }
}


const metadataSchema = z.object({
  bookId: z.string().min(1, "Book ID is required."),
  storagePath: z.string().min(1, "Storage path is required."),
});

async function getTextContentFromStorage(storagePath: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    try {
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
    } catch (e: any) {
        if (e.code === 'storage/object-not-found') {
            throw new Error("Could not find the book file in storage. It may have been deleted.");
        }
        throw e;
    }
}


export async function generateMetadataAction(input: {bookId: string, storagePath: string}): Promise<{ data: GenerateBookMetadataOutput | null, error: string | null }> {
  const validation = metadataSchema.safeParse(input);
  if (!validation.success) {
    return { data: null, error: `Invalid input for metadata generation: ${validation.error.errors.map(e => e.message).join(', ')}` };
  }
  
  const bookDocRef = doc(db, "books", input.bookId);

  try {
    // 1. Generate Metadata
    const bookText = await getTextContentFromStorage(input.storagePath);
    const metadata = await generateBookMetadata({ bookText: bookText.slice(0, 15000) });
    console.log(`Generated metadata for ${input.bookId}:`, metadata);


    // 2. Update Firestore with new metadata
    const updatePayload: Partial<Book> = { ...metadata, description: metadata.description || 'No description generated.' };
    await updateDoc(bookDocRef, updatePayload);
    console.log(`Updated Firestore for ${input.bookId} with metadata.`);

    // 3. Generate Cover Image (asynchronously, don't wait for it)
    generateBookCover({
        title: metadata.title,
        description: metadata.description,
        'data-ai-hint': metadata['data-ai-hint'],
    }).then(async (coverResult) => {
        if (coverResult.coverImage) {
            // coverImage is a data URI, upload it to storage
            const coverImageRef = ref(storage, `covers/${input.bookId}.png`);
            await uploadString(coverImageRef, coverResult.coverImage, 'data_url');
            const downloadURL = await getDownloadURL(coverImageRef);

            await updateDoc(bookDocRef, { coverImage: downloadURL });
            console.log(`Updated Firestore for ${input.bookId} with cover image URL: ${downloadURL}`);
        }
    }).catch(e => console.error("Cover generation and upload failed in background:", e));


    return { data: metadata, error: null };
  } catch (e: any) {
    console.error("Metadata generation failed:", e);
    const errorMessage = e.message || 'An unknown error occurred during AI processing.';
    // Optionally update the book with an error state
    await updateDoc(bookDocRef, { description: `AI processing failed: ${errorMessage}` }).catch(err => console.error("Failed to write error state to book", err));
    return { data: null, error: `Failed to generate metadata: ${errorMessage}` };
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
  } catch (e: any) {
    console.error("Summary generation failed:", e);
    return { data: null, error: `Failed to generate summary: ${e.message || 'Please try again.'}` };
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
    return { data: null, error: `Failed to generate audiobook: ${e.message || 'Please try again.'}` };
  }
}
