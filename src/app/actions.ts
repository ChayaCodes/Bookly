"use server";

import { generateBookMetadata, GenerateBookMetadataInput, GenerateBookMetadataOutput } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent, SummarizeBookContentInput, SummarizeBookContentOutput } from '@/ai/flows/summarize-book-content';
import { generateAudiobook, GenerateAudiobookInput, GenerateAudiobookOutput } from '@/ai/flows/generate-audiobook';
import { generateBookCover, GenerateBookCoverInput } from '@/ai/flows/generate-book-cover';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { ref, getBlob, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getDoc, addDoc, collection } from 'firebase/firestore';
import type { Book } from '@/lib/types';


const uploadSchema = z.object({
  fileName: z.string(),
  fileDataUrl: z.string().refine(val => val.startsWith('data:'), "Invalid data URL format."),
});

export async function uploadBookAction(input: z.infer<typeof uploadSchema>): Promise<{ bookId: string | null, error: string | null }> {
    const validation = uploadSchema.safeParse(input);
    if (!validation.success) {
        return { bookId: null, error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    
    const { fileName, fileDataUrl } = validation.data;
    
    // Create an initial placeholder document in Firestore
    let bookId: string;
    try {
        const initialBook: Omit<Book, 'id' | 'createdAt'> = {
            type: 'text',
            title: fileName.replace(/\.[^/.]+$/, ""),
            author: 'Processing...',
            description: 'Your book is being uploaded and processed. Metadata will appear here shortly.',
            tags: ['new'],
            coverImage: `https://placehold.co/400x600/9ca3da/2a2e45?text=Processing`,
            'data-ai-hint': 'book cover',
            language: 'English',
            readingProgress: 0,
        };
        const docRef = await addDoc(collection(db, "books"), initialBook);
        bookId = docRef.id;
        console.log("Created initial book document:", bookId);
    } catch (e: any) {
        console.error("Failed to create initial book in Firestore:", e);
        return { bookId: null, error: 'Failed to create book record in the database.' };
    }

    const storagePath = `books/${bookId}-${fileName}`;
    const storageRef = ref(storage, storagePath);

    try {
        // Upload the file to Firebase Storage
        await uploadString(storageRef, fileDataUrl, 'data_url');
        console.log("Upload successful for:", storagePath);
        
        // Update the book document with the storage path
        await updateDoc(doc(db, "books", bookId), { storagePath });
        console.log(`Updated book ${bookId} with storagePath.`);

        // Trigger the metadata generation in the background (don't await)
        generateMetadataAction({ bookId: bookId, storagePath: storagePath });

        return { bookId: bookId, error: null };
    } catch (e: any) {
        console.error("Server-side upload failed:", e);
        // Update the book with an error state
        await updateDoc(doc(db, 'books', bookId), { description: `File upload failed: ${e.message}` }).catch(err => console.error("Failed to write error state to book", err));

        let errorMessage = "An unknown error occurred during file upload.";
        if (e.code === 'storage/unauthorized') {
            errorMessage = "Upload failed: Permission denied. Your Firebase Storage security rules may not allow unauthenticated writes.";
        } else if (e.code === 'storage/unknown') {
            errorMessage = 'An unknown storage error occurred. This might be due to incorrect Firebase Storage setup or rules. Please ensure your rules allow unauthenticated writes if you do not have a login system.';
        }
        return { bookId: null, error: errorMessage };
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
            if (text.trim().length === 0) {
                 return "This document appears to be empty or in a format that could not be read as text.";
            }
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
    const error = `Invalid input for metadata generation: ${validation.error.errors.map(e => e.message).join(', ')}`;
    console.error(error);
    return { data: null, error };
  }
  
  const { bookId, storagePath } = validation.data;
  const bookDocRef = doc(db, "books", bookId);

  try {
    // 1. Generate Metadata
    console.log(`[${bookId}] Starting metadata generation...`);
    const bookText = await getTextContentFromStorage(storagePath);
    const metadata = await generateBookMetadata({ bookText: bookText.slice(0, 15000) });
    console.log(`[${bookId}] Generated metadata:`, metadata);

    // 2. Update Firestore with new metadata
    const updatePayload: Partial<Book> = { ...metadata, description: metadata.description || 'No description generated.' };
    await updateDoc(bookDocRef, updatePayload);
    console.log(`[${bookId}] Updated Firestore with metadata.`);

    // 3. Generate Cover Image (asynchronously, don't wait for it)
    console.log(`[${bookId}] Triggering cover generation in the background.`);
    generateBookCover({
        title: metadata.title,
        description: metadata.description,
        'data-ai-hint': metadata['data-ai-hint'],
    }).then(async (coverResult) => {
        if (coverResult.coverImage) {
            // coverImage is a data URI, upload it to storage
            const coverImageRef = ref(storage, `covers/${bookId}.png`);
            await uploadString(coverImageRef, coverResult.coverImage, 'data_url');
            const downloadURL = await getDownloadURL(coverImageRef);

            await updateDoc(bookDocRef, { coverImage: downloadURL });
            console.log(`[${bookId}] Updated Firestore with cover image URL: ${downloadURL}`);
        }
    }).catch(e => console.error(`[${bookId}] Cover generation and upload failed in background:`, e));

    return { data: metadata, error: null };
  } catch (e: any) {
    console.error(`[${bookId}] Metadata generation failed:`, e);
    const errorMessage = e.message || 'An unknown error occurred during AI processing.';
    // Update the book with an error state
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
