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
} from 'firebase/firestore';
import { ref, deleteObject, uploadString, getDownloadURL } from "firebase/storage";

interface BookLibraryContextType {
  books: Book[];
  updateBook: (updatedBook: Partial<Book> & { id: string, coverDataUrl?: string | null }) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  findBookById: (id: string) => Promise<Book | undefined>;
  refreshBooks: () => Promise<void>; // Add a manual refresh function
  
  // For the new book flow
  pendingBook: PendingBook | null;
  setPendingBook: (book: PendingBook | null) => void;
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
  const [pendingBook, setPendingBook] = React.useState<PendingBook | null>(null);

  const fetchBooks = React.useCallback(async () => {
    try {
        const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const booksData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...convertTimestamps(doc.data()),
        } as Book));
        setBooks(booksData);
    } catch (error) {
        console.error("Error fetching books from Firestore:", error);
    }
  }, []);

  // Initial fetch and listen for real-time updates
  React.useEffect(() => {
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const booksData: Book[] = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...convertTimestamps(doc.data()),
      } as Book));
      setBooks(booksData);
    }, (error) => {
      console.error("Error with real-time book listener:", error);
    });

    return () => unsubscribe();
  }, []);
  

  const updateBook = async (updatedBook: Partial<Book> & { id: string, coverDataUrl?: string | null }) => {
    const { id, coverDataUrl, ...dataToUpdate } = updatedBook;
    const bookDocRef = doc(db, 'books', id);
    
    if (coverDataUrl) {
      const coverImageRef = ref(storage, `covers/${id}.png`);
      await uploadString(coverImageRef, coverDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(coverImageRef);
      dataToUpdate.coverImage = downloadURL;
      console.log(`[${id}] ✅ Cover image updated and URL generated: ${downloadURL}`);
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
    if (bookToDelete?.audioStoragePath) {
       try {
            await deleteObject(ref(storage, bookToDelete.audioStoragePath));
       } catch (e: any) {
            if (e.code !== 'storage/object-not-found') console.error("Error deleting audio file:", e);
       }
    }
  };
  
  const findBookById = async (id: string): Promise<Book | undefined> => {
    const bookDocRef = doc(db, 'books', id);
    const bookDoc = await getDoc(bookDocRef);

    if (bookDoc.exists()) {
        return { id: bookDoc.id, ...convertTimestamps(bookDoc.data()) } as Book;
    }
    return undefined;
  };

  const value = { books, updateBook, deleteBook, findBookById, refreshBooks: fetchBooks, pendingBook, setPendingBook };

  return (
    <BookLibraryContext.Provider value={value}>
      {children}
    </BookLibraryContext.Provider>
  );
}
