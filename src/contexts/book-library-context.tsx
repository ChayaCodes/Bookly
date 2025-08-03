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
  DocumentReference,
} from 'firebase/firestore';
import { ref, deleteObject } from "firebase/storage";

interface BookLibraryContextType {
  books: Book[];
  addBook: (book: Omit<Book, 'createdAt'>) => Promise<Book>;
  updateBook: (updatedBook: Partial<Book> & { id: string }) => Promise<void>;
  deleteBook: (id: string) => Promise<void>;
  findBookById: (id: string) => Promise<Book | undefined>;
}

export const BookLibraryContext = React.createContext<BookLibraryContextType | undefined>(undefined);

export function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    const q = query(collection(db, 'books'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const booksData: Book[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        booksData.push({
          id: doc.id,
          ...data,
        } as Book);
      });
      setBooks(booksData);
      setIsLoaded(true);
    }, (error) => {
      console.error("Error fetching books from Firestore:", error);
    });

    return () => unsubscribe();
  }, []);
  

  const addBook = async (book: Omit<Book, 'createdAt'>) => {
     const now = Date.now();
     const bookWithTimestamp = { ...book, createdAt: now };
     const bookDocRef = doc(db, 'books', book.id);
     
     await setDoc(bookDocRef, bookWithTimestamp);

     // This relies on the onSnapshot listener to update the local state.
     // For immediate UI feedback, we could manually add it, but this is more robust.
     // setBooks(prevBooks => [bookWithTimestamp as Book, ...prevBooks]);
     
     return bookWithTimestamp as Book;
  };

  const updateBook = async (updatedBook: Partial<Book> & { id: string }) => {
    const { id, ...dataToUpdate } = updatedBook;
    const bookDocRef = doc(db, 'books', id);
    await updateDoc(bookDocRef, dataToUpdate);
  };
  
  const deleteBook = async (id: string) => {
    const bookToDelete = books.find(b => b.id === id);
    if (!bookToDelete) throw new Error("Book not found in local library.");

    // Delete Firestore document
    await deleteDoc(doc(db, 'books', id));

    // Delete files from Firebase Storage, catching errors if they fail
    if (bookToDelete.storagePath) {
        const fileRef = ref(storage, bookToDelete.storagePath);
        await deleteObject(fileRef).catch(e => console.error("Error deleting main book file:", e));
    }
    if (bookToDelete.audioStoragePath) {
        const audioFileRef = ref(storage, bookToDelete.audioStoragePath);
        await deleteObject(audioFileRef).catch(e => console.error("Error deleting audio file:", e));
    }
  };
  
  const findBookById = async (id: string): Promise<Book | undefined> => {
    // First, try to find the book in the already loaded list
    const localBook = books.find(b => b.id === id);
    if (localBook) {
      return Promise.resolve(localBook);
    }
    // If not found, fetch from firestore (might happen on a deep link)
    const bookDocRef = doc(db, 'books', id);
    const bookDoc = await getDoc(bookDocRef);

    if (bookDoc.exists()) {
        return { id: bookDoc.id, ...bookDoc.data() } as Book;
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
