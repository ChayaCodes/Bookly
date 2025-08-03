"use client";

import * as React from 'react';
import type { Book } from '@/lib/types';

interface BookLibraryContextType {
  books: Book[];
  addBook: (book: Book) => void;
  updateBook: (updatedBook: Partial<Book> & { id: string }) => void;
  findBookById: (id: string) => Book | undefined;
}

export const BookLibraryContext = React.createContext<BookLibraryContextType | undefined>(undefined);

export function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = React.useState<Book[]>(() => {
    // This function now runs only on the client, preventing SSR issues.
    if (typeof window === 'undefined') {
      return [];
    }
    try {
      const storedBooks = window.localStorage.getItem('books');
      return storedBooks ? JSON.parse(storedBooks) : [];
    } catch (error) {
      console.error("Error reading books from localStorage", error);
      return [];
    }
  });
  
  // This effect runs whenever the `books` state changes, saving it to localStorage.
  React.useEffect(() => {
    try {
        // Exclude file content from being stored in localStorage to avoid size issues
        const booksToStore = books.map(({ content, ...book }) => book);
        window.localStorage.setItem('books', JSON.stringify(booksToStore));
    } catch (error) {
        console.error("Error saving books to localStorage", error);
    }
  }, [books]);


  const addBook = (book: Book) => {
    setBooks(prevBooks => [book, ...prevBooks]);
  };

  const updateBook = (updatedBook: Partial<Book> & { id: string }) => {
    setBooks(prevBooks =>
      prevBooks.map(book => 
        book.id === updatedBook.id ? { ...book, ...updatedBook } : book
      )
    );
  };
  
  const findBookById = (id: string) => {
    const bookFromState = books.find(book => book.id === id);
    if (bookFromState) return bookFromState;
    
    // As a fallback, try to find the book in localStorage if it is not in the state.
    // This can happen if the book content is not loaded in the initial state.
    try {
        if (typeof window !== 'undefined') {
            const storedBooks = window.localStorage.getItem('books');
            const allBooks = storedBooks ? JSON.parse(storedBooks) : [];
            return allBooks.find((b: Book) => b.id === id);
        }
    } catch(e) {
        console.error("Failed to read from localstorage", e);
    }
    return undefined;
  };

  const value = { books, addBook, updateBook, findBookById };

  return (
    <BookLibraryContext.Provider value={value}>
      {children}
    </BookLibraryContext.Provider>
  );
}
