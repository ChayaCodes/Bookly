"use client";

import * as React from 'react';
import type { Book } from '@/lib/types';
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
  setDoc,
  addDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage";

interface BookLibraryContextType {
  books: Book[];
  addBook: (book: Omit<Book, 'id' | 'createdAt'>) => Promise<Book>;
  updateBook: (updatedBook: Partial<Book> & { id: string }) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  findBookById: (id: string) => Promise<Book | undefined>;
}

export const BookLibraryContext = React.createContext<BookLibraryContextType | undefined>(undefined);

// Helper to convert Firestore Timestamps to numbers
const convertTimestamps = (data: any) => {
    for (const key in data) {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toMillis();
        } else if (typeof data[key] === 'object' && data[key] !== null) {
            convertTimestamps(data[key]);
        }
    }
    return data;
}

export function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = React.useState<Book[]>([]);

  React.useEffect(() => {
    // The "books" collection is created automatically by Firestore if it doesn't exist.
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const booksData: Book[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Firestore Timestamps need to be converted to numbers for serialization
        const convertedData = convertTimestamps(data);
        booksData.push({
          id: doc.id,
          ...convertedData,
        } as Book);
      });
      setBooks(booksData);
    }, (error) => {
      console.error("Error fetching books from Firestore:", error);
    });

    return () => unsubscribe();
  }, []);
  

  const addBook = async (book: Omit<Book, 'id' | 'createdAt'>) => {
     // Firestore will automatically create the 'books' collection if it doesn't exist
     const bookWithTimestamp = { ...book, createdAt: Timestamp.now() };
     const docRef = await addDoc(collection(db, "books"), bookWithTimestamp);
     
     // This function returns the book with its new ID and the timestamp.
     // The onSnapshot listener will also update the global state, but returning
     // it here can be useful for immediate feedback if needed.
     return { ...bookWithTimestamp, id: docRef.id, createdAt: bookWithTimestamp.createdAt.toMillis() } as Book;
  };

  const updateBook = async (updatedBook: Partial<Book> & { id: string }) => {
    const { id, ...dataToUpdate } = updatedBook;
    const bookDocRef = doc(db, 'books', id);
    await updateDoc(bookDocRef, dataToUpdate);
  };
  
  const deleteBook = async (id: string) => {
    const bookDocRef = doc(db, 'books', id);
    const bookToDelete = await findBookById(id);

    // Delete Firestore document
    await deleteDoc(bookDocRef);

    // Delete files from Firebase Storage if they exist
    if (bookToDelete?.storagePath) {
        try {
            const fileRef = ref(storage, bookToDelete.storagePath);
            await deleteObject(fileRef);
        } catch (e: any) {
             // It's okay if the file doesn't exist, so we only log other errors
            if (e.code !== 'storage/object-not-found') {
              console.error("Error deleting main book file:", e)
            }
        }
    }
     if (bookToDelete?.coverImage && bookToDelete.coverImage.includes('firebasestorage')) {
        try {
            const coverRef = ref(storage, bookToDelete.coverImage);
            await deleteObject(coverRef);
        } catch (e: any) {
            if (e.code !== 'storage/object-not-found') {
                console.error("Error deleting cover image file:", e)
            }
        }
    }
    if (bookToDelete?.audioStoragePath) {
       try {
            const audioFileRef = ref(storage, bookToDelete.audioStoragePath);
            await deleteObject(audioFileRef);
       } catch (e: any) {
            if (e.code !== 'storage/object-not-found') {
                console.error("Error deleting audio file:", e);
            }
       }
    }
  };
  
  const findBookById = async (id: string): Promise<Book | undefined> => {
    // First, try to find the book in the already loaded list
    const localBook = books.find(b => b.id === id);
    if (localBook) {
      return Promise.resolve(localBook);
    }
    
    // If not found, fetch from firestore (might happen on a deep link or if snapshot is stale)
    const bookDocRef = doc(db, 'books', id);
    const bookDoc = await getDoc(bookDocRef);

    if (bookDoc.exists()) {
        const data = bookDoc.data();
        const convertedData = convertTimestamps(data);
        return { id: bookDoc.id, ...convertedData } as Book;
    }
    return undefined;
  };

  const value = { books, addBook, updateBook, deleteBook, findBookById };

  return (
    <BookLibraryContext.Provider value={value}>
      {children}
    </BookLibraryContext.Provider>
  );
}
