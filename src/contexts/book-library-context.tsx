"use client";

import * as React from 'react';
import type { Book, PendingBook } from '@/lib/types';
import { db, storage } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { ref, deleteObject, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";
import { saveBookAction, processUploadedAudiobookAction, triggerAICoverGeneration } from '@/app/actions';

interface BookLibraryContextType {
  books: Book[];
  addBook: (book: Book) => Promise<void>;
  updateBook: (updatedBook: Partial<Book> & { id: string }) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  findBookById: (id: string) => Promise<Book | undefined>;
  refreshBooks: () => Promise<void>;
  
  pendingBook: (Omit<PendingBook, 'id'> & { id?: string }) | null;
  setPendingBook: (book: (Omit<PendingBook, 'id'> & { id?: string }) | null) => void;
}


export const BookLibraryContext = React.createContext<BookLibraryContextType | undefined>(undefined);

const convertTimestamps = (data: any): any => {
    if (data instanceof Timestamp) {
        return data.toMillis();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestamps);
    }
    if (typeof data === 'object' && data !== null) {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = convertTimestamps(data[key]);
        }
        return res;
    }
    return data;
};

export function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [pendingBook, setPendingBook] = React.useState<(Omit<PendingBook, 'id'> & { id?: string }) | null>(null);

  // Combines firestore books with local-only books
  const getCombinedBooks = (firestoreBooks: Book[], localBooks: Book[]) => {
    const firestoreIds = new Set(firestoreBooks.map(b => b.id));
    const uniqueLocalBooks = localBooks.filter(b => !firestoreIds.has(b.id));
    return [...uniqueLocalBooks, ...firestoreBooks].sort((a, b) => b.createdAt - a.createdAt);
  };
  
  React.useEffect(() => {
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const firestoreBooks: Book[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data()),
          status: 'ready', // Books from firestore are always ready
      } as Book));
      
      setBooks(prevBooks => {
        // Get existing local books (that haven't been saved yet)
        const localOnlyBooks = prevBooks.filter(b => b.status && b.status !== 'ready');
        return getCombinedBooks(firestoreBooks, localOnlyBooks);
      });

    }, (error) => {
      console.error("Error with real-time book listener:", error);
    });

    return () => unsubscribe();
  }, []);

  const addBook = async (book: Book) => {
    if (!book.localFile) {
        throw new Error("No file provided for upload.");
    }
    
    // Optimistically add to UI
    setBooks(prevBooks => getCombinedBooks(prevBooks, [book]));
    setPendingBook(book); // Clear pending book state from form

    const { localFile, ...bookDataToSave } = book;

    try {
        // 1. Upload main file (book or zip)
        let storagePath = `books/${book.id}/${localFile.name}`;
        if(book.type === 'audio') {
            storagePath = `audiobooks_zips/${book.id}/${localFile.name}`;
        }
        const fileRef = ref(storage, storagePath);
        await uploadBytes(fileRef, localFile);
        book.storagePath = storagePath;
        updateBookInState(book.id, { status: 'uploading' });

        // 2. Upload cover image (if it's a local data URL)
        if (book.coverImage && book.coverImage.startsWith('data:')) {
            const coverRef = ref(storage, `covers/${book.id}.png`);
            await uploadString(coverRef, book.coverImage, 'data_url');
            book.coverImage = await getDownloadURL(coverRef);
        }

        // 3. Save metadata to Firestore
        const { status, ...firestoreData } = book; // Don't save client-side status
        await setDoc(doc(db, "books", book.id), firestoreData);
        
        // 4. Trigger server-side processing for audio or AI cover
        if (book.type === 'audio') {
             await processUploadedAudiobookAction({ bookId: book.id });
        } else if (!book.coverImage) {
            await triggerAICoverGeneration(book.id);
        }

        // Final state update is handled by the onSnapshot listener
    } catch (e: any) {
        console.error("Failed to add book:", e);
        // Remove the optimistic update on failure
        setBooks(prev => prev.filter(b => b.id !== book.id));
        throw e;
    }
  };
  
  const updateBookInState = (bookId: string, updates: Partial<Book>) => {
      setBooks(prev => prev.map(b => b.id === bookId ? {...b, ...updates} : b));
  }
  
  const updateBook = async (updatedBook: Partial<Book> & { id: string }) => {
    const { id, ...dataToUpdate } = updatedBook;
    const bookDocRef = doc(db, 'books', id);
    
    if (dataToUpdate.coverImage && dataToUpdate.coverImage.startsWith('data:')) {
      const coverImageRef = ref(storage, `covers/${id}.png`);
      await uploadString(coverImageRef, dataToUpdate.coverImage, 'data_url');
      dataToUpdate.coverImage = await getDownloadURL(coverImageRef);
    }
    
    await updateDoc(bookDocRef, dataToUpdate);
  };
  
  const deleteBook = async (id: string) => {
    const bookDocRef = doc(db, 'books', id);
    const bookToDelete = await findBookById(id);

    await deleteDoc(bookDocRef);

    if (bookToDelete?.storagePath) {
        try {
            await deleteObject(ref(storage, bookToDelete.storagePath));
        } catch (e: any) {
            if (e.code !== 'storage/object-not-found') console.error("Error deleting main book file:", e);
        }
    }
     if (bookToDelete?.coverImage && bookToDelete.coverImage.includes('firebasestorage')) {
        try {
            const coverRef = ref(storage, bookToDelete.coverImage);
            await deleteObject(coverRef);
        } catch (e: any) {
             if (e.code !== 'storage/object-not-found') console.error("Error deleting cover image file:", e);
        }
    }
    if (bookToDelete?.chapters) {
        const deletePromises = bookToDelete.chapters.map(ch => deleteObject(ref(storage, ch.storagePath)));
        await Promise.allSettled(deletePromises);
    }
  };
  
  const findBookById = async (id: string): Promise<Book | undefined> => {
     // First, check local state for pending/uploading books
    const localBook = books.find(b => b.id === id);
    if (localBook) return localBook;

    // If not found locally, fetch from Firestore
    const bookDocRef = doc(db, 'books', id);
    const bookDoc = await getDoc(bookDocRef);

    if (bookDoc.exists()) {
        return { id: bookDoc.id, ...convertTimestamps(bookDoc.data()) } as Book;
    }
    return undefined;
  };

  const fetchBooks = async () => {}; // No longer needed for manual refresh

  const value = { books, addBook, updateBook, deleteBook, findBookById, refreshBooks: fetchBooks, pendingBook, setPendingBook };

  return (
    <BookLibraryContext.Provider value={value}>
      {children}
    </BookLibraryContext.Provider>
  );
}
