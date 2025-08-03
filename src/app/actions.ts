"use server";

import { generateBookMetadata } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent } from '@/ai/flows/summarize-book-content';
import { generateAudiobook } from '@/ai/flows/generate-audiobook';
import { generateBookCover } from '@/ai/flows/generate-book-cover';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, getBlob } from 'firebase/storage';
import { doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import type { Book } from '@/lib/types';


const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileDataUrl: z.string().refine(val => val.startsWith('data:'), "Invalid data URL format."),
});

export async function uploadBookAction(values: z.infer<typeof uploadSchema>): Promise<{ bookId: string } | { error: string }> {
    const validation = uploadSchema.safeParse(values);
    if (!validation.success) {
        return { error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    
    const { fileName, fileDataUrl } = validation.data;
    
    // 1. Create a placeholder document in Firestore to get an ID
    let bookId: string;
    try {
        const placeholder: Omit<Book, 'id'> = {
            type: 'text',
            title: fileName.replace(/\.[^/.]+$/, ""),
            author: 'Processing...',
            description: 'Your book is being uploaded. Metadata will appear here shortly.',
            tags: ['new'],
            coverImage: `https://placehold.co/400x600/9ca3da/2a2e45?text=Processing`,
            'data-ai-hint': 'book cover',
            language: 'English',
            readingProgress: 0,
            createdAt: Timestamp.now().toMillis(), // Use server timestamp
        };
        const docRef = await addDoc(collection(db, "books"), placeholder);
        bookId = docRef.id;
        console.log("✅ Firestore record created (placeholder):", { id: bookId, ...placeholder });
    } catch (e: any) {
        console.error("❌ Failed to create initial book in Firestore:", e);
        return { error: 'Failed to create book record in the database.' };
    }

    // 2. Upload the file to Firebase Storage
    const storagePath = `books/${bookId}/${fileName}`;
    const storageRef = ref(storage, storagePath);

    try {
        await uploadString(storageRef, fileDataUrl, 'data_url');
        console.log(`[${bookId}] ✅ Upload successful for:`, storagePath);
        
        // Update the book document with the storage path
        await updateDoc(doc(db, "books", bookId), { storagePath });
        console.log(`[${bookId}] ✅ Firestore record updated with storagePath.`);

        // 3. Trigger background processing (DO NOT await this)
        processBookInBackground(bookId, storagePath);

        return { bookId: bookId };
    } catch (e: any) {
        console.error(`[${bookId}] ❌ Server-side upload failed:`, e);
        const errorMessage = e.message || 'An unknown error occurred during file upload.';
        await updateDoc(doc(db, 'books', bookId), { description: `File upload failed: ${errorMessage}` });
        return { error: errorMessage };
    }
}

// This function runs in the background and does not block the initial response
async function processBookInBackground(bookId: string, storagePath: string) {
    const bookDocRef = doc(db, "books", bookId);
    try {
        console.log(`[${bookId}] ⏳ Starting background processing...`);
        const fileRef = ref(storage, storagePath);
        const blob = await getBlob(fileRef);
        
        // This is a simplified text extraction. Real-world apps need more robust parsers.
        const bookText = await blob.text();
        const truncatedText = bookText.slice(0, 15000);

        // Generate Metadata
        console.log(`[${bookId}] 🧠 Generating metadata...`);
        const metadata = await generateBookMetadata({ bookText: truncatedText });
        console.log(`[${bookId}] 🤖 AI-Generated Metadata:`, metadata);

        const updatePayload: Partial<Book> = { ...metadata, description: metadata.description || 'No description generated.' };
        await updateDoc(bookDocRef, updatePayload);
        console.log(`[${bookId}] ✅ Firestore record updated with metadata.`);

        // Generate Cover Image
        console.log(`[${bookId}] 🎨 Generating cover image...`);
        const coverResult = await generateBookCover({
            title: metadata.title,
            description: metadata.description,
            'data-ai-hint': metadata['data-ai-hint'],
        });

        if (coverResult.coverImage) {
            const coverImageRef = ref(storage, `covers/${bookId}.png`);
            await uploadString(coverImageRef, coverResult.coverImage, 'data_url');
            const downloadURL = await getDownloadURL(coverImageRef);
            await updateDoc(bookDocRef, { coverImage: downloadURL });
            console.log(`[${bookId}] ✅ Firestore record updated with Cover Image URL: ${downloadURL}`);
        }
    } catch (e: any) {
        console.error(`[${bookId}] ❌ Background processing failed:`, e);
        const errorMessage = e.message || 'An unknown error occurred during AI processing.';
        await updateDoc(bookDocRef, { author: 'Error', description: `AI processing failed: ${errorMessage}` });
    }
}


// --- OTHER ACTIONS (summarize, create audiobook etc.) ---

const summarySchema = z.object({
  storagePath: z.string().min(1, "Storage path is required."),
});

async function getTextContentFromStorage(storagePath: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    try {
        const blob = await getBlob(fileRef);
        // This is a placeholder for actual text extraction from PDF/EPUB on the server.
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


export async function summarizeContentAction(input: {storagePath: string}) {
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

export async function generateAudiobookAction(input: {storagePath: string}) {
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
