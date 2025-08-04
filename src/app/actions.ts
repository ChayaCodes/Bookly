
"use server";

import { generateBookMetadata } from '@/ai/flows/generate-book-metadata';
import { summarizeBookContent } from '@/ai/flows/summarize-book-content';
import { generateAudiobook } from '@/ai/flows/generate-audiobook';
import { generateBookCover } from '@/ai/flows/generate-book-cover';
import { z } from 'zod';
import { db, storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL, getBytes, uploadBytes, deleteObject } from 'firebase/storage';
import { doc, updateDoc, addDoc, collection, Timestamp, getDoc } from 'firebase/firestore';
import type { Book, Chapter } from '@/lib/types';
import JSZip from 'jszip';


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


// Action to save the book metadata and prepare for upload
const saveBookSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string(),
  tags: z.array(z.string()),
  language: z.string(),
  'data-ai-hint': z.string(),
  fileName: z.string().min(1),
  type: z.enum(['epub', 'pdf', 'text', 'audio']),
});


export async function saveBookAction(values: z.infer<typeof saveBookSchema>): Promise<{ bookId: string, storagePath: string } | { error: string }> {
    const validation = saveBookSchema.safeParse(values);
    if (!validation.success) {
        return { error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    const { fileName, type, ...bookMetadata } = validation.data;

    try {
        const newBookData: Omit<Book, 'id' | 'coverImage' | 'chapters' | 'storagePath'> = {
            ...bookMetadata,
            type: type,
            readingProgress: 0,
            createdAt: Timestamp.now().toMillis(),
        };
        
        console.log("✅ Firestore record (initial) about to be created:", newBookData);
        const docRef = await addDoc(collection(db, "books"), newBookData);
        const bookId = docRef.id;
        console.log("✅ Firestore record created:", { id: bookId, ...newBookData });
        
        const storagePath = type === 'audio' 
            ? `audiobooks_zips/${bookId}/${fileName}` // Temp path for zip
            : `books/${bookId}/${fileName}`; // Final path for other types

        // For audio, we immediately update the doc with the temp zip path
        if (type === 'audio') {
            await updateDoc(docRef, { storagePath });
        }
        
        return { bookId, storagePath };

    } catch (e: any) {
        console.error("❌ Failed to create book in Firestore:", e);
        return { error: 'Failed to create book record in the database.' };
    }
}


const processAudioSchema = z.object({
  bookId: z.string(),
});

export async function processUploadedAudiobookAction(values: z.infer<typeof processAudioSchema>): Promise<{ success: boolean } | { error: string }> {
    const validation = processAudioSchema.safeParse(values);
    if (!validation.success) {
        return { error: `Invalid input: ${validation.error.errors.map(e => e.message).join(', ')}` };
    }
    
    const { bookId } = validation.data;
    console.log(`[${bookId}] 🎵 Starting audio processing server-side...`);
    
    const bookDocRef = doc(db, "books", bookId);
    
    try {
        const bookDoc = await getDoc(bookDocRef);
        if (!bookDoc.exists() || !bookDoc.data().storagePath) {
            throw new Error("Book record or temporary ZIP file path not found.");
        }
        
        const zipStoragePath = bookDoc.data().storagePath;
        console.log(`[${bookId}] -> Fetching ZIP from ${zipStoragePath}`);
        
        const zipFileRef = ref(storage, zipStoragePath);
        const zipBuffer = await getBytes(zipFileRef);
        
        const zip = await JSZip.loadAsync(zipBuffer);
        const chapterPromises: Promise<Chapter>[] = [];
        const audioFiles = Object.keys(zip.files).filter(fileName => 
            !zip.files[fileName].dir && /\.(mp3|m4a|wav)$/i.test(fileName)
        );

        // Natural sort for filenames like "Chapter 1", "Chapter 10", "Chapter 2"
        audioFiles.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        for (const fileName of audioFiles) {
            const file = zip.files[fileName];
            console.log(`[${bookId}] -> Processing file: ${fileName}`);
            
            const p = (async () => {
                const audioBuffer = await file.async('nodebuffer');
                const chapterPath = `audiobooks/${bookId}/${fileName}`;
                const chapterRef = ref(storage, chapterPath);
                
                // Determine content type from file extension
                const extension = fileName.split('.').pop()?.toLowerCase();
                let contentType = 'audio/mpeg'; // default
                if (extension === 'm4a') contentType = 'audio/mp4';
                if (extension === 'wav') contentType = 'audio/wav';

                await uploadBytes(chapterRef, audioBuffer, { contentType });
                
                return {
                    title: fileName.replace(/\.[^/.]+$/, ""),
                    storagePath: chapterPath
                };
            })();
            chapterPromises.push(p);
        }

        const chapters = await Promise.all(chapterPromises);
        
        if (chapters.length === 0) {
            return { error: "No valid audio files (.mp3, .m4a, .wav) were found in the ZIP." };
        }

        // Update the book with chapters and remove the now-unnecessary zip path
        await updateDoc(bookDocRef, { 
            chapters: chapters,
            storagePath: null // Or delete the field
        });

        // Clean up the original ZIP file
        await deleteObject(zipFileRef);
        console.log(`[${bookId}] -> Deleted temporary ZIP file.`);

        console.log(`[${bookId}] ✅ Successfully uploaded and processed ${chapters.length} chapters.`);
        return { success: true };

    } catch (e: any) {
        console.error(`[${bookId}] ❌ Audio processing failed:`, e);
        // Attempt to clean up on failure
        await updateDoc(bookDocRef, { description: `Audio processing failed: ${e.message}` });
        return { error: `Server-side audio processing failed: ${e.message}` };
    }
}


// This action is now called *after* the client has uploaded the cover.
export async function triggerAICoverGeneration(bookId: string) {
    const bookDocRef = doc(db, "books", bookId);
    const bookDoc = await getDoc(bookDocRef);

    if (!bookDoc.exists()) {
        console.error(`[${bookId}] ❌ Book not found for AI cover generation.`);
        return;
    }
    const bookData = bookDoc.data();

    // Don't generate a cover if one already exists or if it's an audiobook.
    if (bookData.coverImage || bookData.type === 'audio') {
        return;
    }

    try {
        console.log(`[${bookId}] 🎨 Generating cover image with AI...`);
        const coverResult = await generateBookCover({ 
            title: bookData.title, 
            description: bookData.description, 
            'data-ai-hint': bookData['data-ai-hint'] || 'book cover'
        });

        if (coverResult.coverImage) {
            await generateCoverFromDataUrl(bookId, coverResult.coverImage);
        }
    } catch (e: any) {
        console.error(`[${bookId}] ❌ AI Cover generation failed:`, e);
        const errorMessage = e.message || 'An unknown error occurred during cover generation.';
        const existingDesc = bookDoc.data()?.description || '';
        await updateDoc(bookDocRef, { description: `${existingDesc}\n\nCover generation failed: ${errorMessage}` });
    }
}

async function generateCoverFromDataUrl(bookId: string, dataUrl: string) {
     const bookDocRef = doc(db, "books", bookId);
    try {
        console.log(`[${bookId}] 🎨 Uploading provided cover image...`);
        const coverImageRef = ref(storage, `covers/${bookId}.png`);
        await uploadString(coverImageRef, dataUrl, 'data_url');
        const downloadURL = await getDownloadURL(coverImageRef);
        console.log(`[${bookId}] ✅ Cover image URL generated: ${downloadURL}`);
        await updateDoc(bookDocRef, { coverImage: downloadURL });
        console.log(`[${bookId}] ✅ Firestore record updated with Cover Image URL.`);
    } catch (e: any) {
        console.error(`[${bookId}] ❌ Provided cover upload failed:`, e);
    }
}


// --- OTHER ACTIONS (summarize, create audiobook etc.) ---

export async function getArrayBufferFromStorage(storagePath: string): Promise<string> {
    const fileRef = ref(storage, storagePath);
    try {
        const bytes = await getBytes(fileRef);
        // Convert ArrayBuffer to Base64 string for serialization
        const buffer = Buffer.from(bytes);
        return buffer.toString('base64');
    } catch (e: any) {
        if (e.code === 'storage/object-not-found') {
            throw new Error("Could not find the book file in storage. It may have been deleted.");
        }
        throw e;
    }
}

export async function getTextContentFromStorage(storagePath: string): Promise<string> {
    try {
      const base64Content = await getArrayBufferFromStorage(storagePath);
      const buffer = Buffer.from(base64Content, 'base64');
      // Use a robust TextDecoder to handle various encodings, especially UTF-8 for Hebrew.
      const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
      const text = decoder.decode(buffer);
      if (text.trim().length === 0) {
           return "This document appears to be empty or in a format that could not be read as text.";
      }
      return text;
    } catch (e) {
        console.warn(`Could not decode ${storagePath} as text. This is expected for binary files like PDF or EPUB. Returning placeholder content.`);
        return "This document is in a format that cannot be displayed as plain text. Summary and other features will be based on available metadata.";
    }
}


const summarySchema = z.object({
  storagePath: z.string().min(1, "Storage path is required."),
});


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
  } catch (e: any)
{
    console.error("Audiobook generation failed:", e);
    return { data: null, error: `Failed to generate audiobook: ${e.message || 'Please try again.'}` };
  }
}
