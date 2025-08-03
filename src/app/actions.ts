"use server";

import { generateBookMetadata } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent } from '@/ai/flows/summarize-book-content';
import { generateAudiobook } from '@/ai/flows/generate-audiobook';
import { generateBookCover } from '@/ai/flows/generate-book-cover';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, getBytes } from 'firebase/storage';
import { doc, updateDoc, addDoc, collection, Timestamp, getDoc } from 'firebase/firestore';
import type { Book } from '@/lib/types';


// Action to process text and return metadata WITHOUT saving
const extractMetadataSchema = z.object({
    fileName: z.string().min(1),
    fileText: z.string().min(1),
});

export async function extractMetadataAction(values: z.infer<typeof extractMetadataSchema>) {
    const validation = extractMetadataSchema.safeParse(values);
    if (!validation.success) {
        return { error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    
    const { fileName, fileText } = validation.data;
    try {
        console.log(`[Metadata Extraction] 🧠 Generating metadata for ${fileName}...`);
        const truncatedText = fileText.slice(0, 15000);
        const metadata = await generateBookMetadata({ bookText: truncatedText });
        console.log(`[Metadata Extraction] 🤖 AI-Generated Metadata:`, metadata);

        // If AI fails to find a title, use the filename
        if (!metadata.title) {
            metadata.title = fileName.replace(/\.[^/.]+$/, "");
        }
        
        return { data: metadata };

    } catch(e: any) {
        console.error(`[Metadata Extraction] ❌ Processing failed:`, e);
        const errorMessage = e.message || 'An unknown error occurred during AI processing.';
        return { error: errorMessage };
    }
}


// Action to save the final book data and upload the file
const saveBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  'data-ai-hint': z.string(),
  fileDataUrl: z.string().refine(val => val.startsWith('data:'), "Invalid data URL format."),
  fileName: z.string().min(1),
});


export async function saveBookAction(values: z.infer<typeof saveBookSchema>): Promise<{ bookId: string } | { error: string }> {
    const validation = saveBookSchema.safeParse(values);
    if (!validation.success) {
        return { error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    const { fileDataUrl, fileName, ...bookMetadata } = validation.data;

    let bookId: string;
    // 1. Create the final document in Firestore
    try {
        const newBookData: Omit<Book, 'id' | 'coverImage' | 'storagePath'> = {
            ...bookMetadata,
            type: 'text',
            language: 'English',
            readingProgress: 0,
            createdAt: Timestamp.now().toMillis(),
        };
        console.log("✅ Firestore record about to be created:", newBookData);
        const docRef = await addDoc(collection(db, "books"), newBookData);
        bookId = docRef.id;
        console.log("✅ Firestore record created:", { id: bookId, ...newBookData });
    } catch (e: any) {
        console.error("❌ Failed to create book in Firestore:", e);
        return { error: 'Failed to create book record in the database.' };
    }
    
    // 2. Upload the file to Firebase Storage
    const storagePath = `books/${bookId}/${fileName}`;
    const storageRef = ref(storage, storagePath);
    
    try {
        await uploadString(storageRef, fileDataUrl, 'data_url');
        console.log(`[${bookId}] ✅ File upload successful for:`, storagePath);
        
        // Update the book document with the storage path
        await updateDoc(doc(db, "books", bookId), { storagePath });
        console.log(`[${bookId}] ✅ Firestore record updated with storagePath.`);

        // 3. Trigger cover generation in the background
        generateCoverInBackground(bookId, bookMetadata.title, bookMetadata.description, bookMetadata['data-ai-hint']);

        return { bookId };

    } catch (e: any) {
        console.error(`[${bookId}] ❌ Server-side upload failed:`, e);
        const errorMessage = e.message || 'An unknown error occurred during file upload.';
        // Don't delete the record, just update with an error
        await updateDoc(doc(db, 'books', bookId), { description: `File upload failed: ${errorMessage}` });
        return { error: errorMessage };
    }
}


// This function runs in the background and does not block the initial response
async function generateCoverInBackground(bookId: string, title: string, description: string, hint: string) {
    const bookDocRef = doc(db, "books", bookId);
    try {
        console.log(`[${bookId}] 🎨 Generating cover image...`);
        const coverResult = await generateBookCover({ title, description, 'data-ai-hint': hint });

        if (coverResult.coverImage) {
            const coverImageRef = ref(storage, `covers/${bookId}.png`);
            await uploadString(coverImageRef, coverResult.coverImage, 'data_url');
            const downloadURL = await getDownloadURL(coverImageRef);
            console.log(`[${bookId}] ✅ Cover image URL generated: ${downloadURL}`);
            await updateDoc(bookDocRef, { coverImage: downloadURL });
            console.log(`[${bookId}] ✅ Firestore record updated with Cover Image URL.`);
        }
    } catch (e: any) {
        console.error(`[${bookId}] ❌ Cover generation failed:`, e);
        const errorMessage = e.message || 'An unknown error occurred during cover generation.';
        // Update the description to indicate the failure
        const existingDoc = await getDoc(bookDocRef);
        const existingDesc = existingDoc.data()?.description || '';
        await updateDoc(bookDocRef, { description: `${existingDesc}\n\nCover generation failed: ${errorMessage}` });
    }
}


// --- OTHER ACTIONS (summarize, create audiobook etc.) ---

const summarySchema = z.object({
  storagePath: z.string().min(1, "Storage path is required."),
});

async function getTextContentFromStorage(storagePath: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    try {
        const fileBuffer = await getBytes(fileRef);
        // This is a placeholder for actual text extraction from PDF/EPUB on the server.
        // For now, we are just returning a placeholder text as parsing is complex.
        try {
            const text = new TextDecoder().decode(fileBuffer);
            if (text.trim().length === 0) {
                 return "This document appears to be empty or in a format that could not be read as text.";
            }
            return text;
        } catch (e) {
            console.warn(`Could not decode ${storagePath} as text. This is expected for binary files like PDF or EPUB. Returning placeholder content.`);
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
