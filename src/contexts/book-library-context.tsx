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
import { ref, deleteObject } from "firebase/storage";

interface BookLibraryContextType {
  books: Book[];
  updateBook: (updatedBook: Partial<Book> & { id: string }) => Promise<void>;
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
  

  const updateBook = async (updatedBook: Partial<Book> & { id: string }) => {
    const { id, ...dataToUpdate } = updatedBook;
    const bookDocRef = doc(db, 'books', id);
    await updateDoc(bookDocRef, dataToUpdate);
    // No need to call fetchBooks here, onSnapshot will handle it
  };
  
  const deleteBook = async (id: string) => {
    const bookDocRef = doc(db, 'books', id);
    const bookToDelete = await findBookById(id);

    // Delete Firestore document first
    await deleteDoc(bookDocRef);

    // Then delete associated files from Storage
    if (bookToDelete?.storagePath) {
        try {
            await deleteObject(ref(storage, bookToDelete.storagePath));
        } catch (e: any) {
            if (e.code !== 'storage/object-not-found') console.error("Error deleting main book file:", e);
        }
    }
     if (bookToDelete?.coverImage && bookToDelete.coverImage.includes('firebasestorage')) {
        try {
            await deleteObject(ref(storage, bookToDelete.coverImage));
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
    // onSnapshot will update the list automatically
  };
  
  const findBookById = async (id: string): Promise<Book | undefined> => {
    // Always fetch from server for most up-to-date data
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
