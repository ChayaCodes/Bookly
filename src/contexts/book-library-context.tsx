"use client";

import * as React from 'react';
import type { Book } from '@/lib/types';

interface BookLibraryContextType {
  books: Book[];
  addBook: (book: Book) => void;
  updateBook: (updatedBook: Partial<Book> & { id: string }) => void;
  deleteBook: (id: string) => void;
  findBookById: (id: string) => Book | undefined;
}

export const BookLibraryContext = React.createContext<BookLibraryContextType | undefined>(undefined);

export function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isLoaded, setIsLoaded] = React.useState(false);

  // Load from localStorage only on the client, after initial render
  React.useEffect(() => {
    try {
      const storedBooks = window.localStorage.getItem('books');
      if (storedBooks) {
        setBooks(JSON.parse(storedBooks));
      }
    } catch (error) {
      console.error("Error reading books from localStorage", error);
    }
    setIsLoaded(true);
  }, []);
  
  // This effect runs whenever the `books` state changes, saving it to localStorage.
  React.useEffect(() => {
    // Only save to localStorage after the initial load to prevent overwriting
    if (isLoaded) {
        try {
            // Exclude file content from being stored in localStorage to avoid size issues
            const booksToStore = books.map(({ content, ...book }) => book);
            window.localStorage.setItem('books', JSON.stringify(booksToStore));
        } catch (error) {
            console.error("Error saving books to localStorage", error);
        }
    }
  }, [books, isLoaded]);


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
  
  const deleteBook = (id: string) => {
    setBooks(prevBooks => prevBooks.filter(book => book.id !== id));
    // Also remove from content storage
     if (typeof window !== 'undefined') {
        try {
            const stored = window.localStorage.getItem('books_content') || '[]';
            const contents = JSON.parse(stored);
            const newContents = contents.filter((item: {id: string}) => item.id !== id);
            window.localStorage.setItem('books_content', JSON.stringify(newContents));
        } catch (e) {
            console.error("Failed to remove book content from localStorage", e);
        }
     }
  };
  
  const findBookById = (id: string): Book | undefined => {
    const bookFromState = books.find(book => book.id === id);

    if (bookFromState && bookFromState.content) {
      return bookFromState;
    }
    
    if (typeof window !== 'undefined') {
      try {
        const storedBooksRaw = window.localStorage.getItem('books_content');
        if (storedBooksRaw) {
            const storedBooksContent = JSON.parse(storedBooksRaw);
            const bookWithContent = storedBooksContent.find((b: {id: string}) => b.id === id);

            if (bookWithContent) {
               return {...bookFromState, ...bookWithContent };
            }
        }
      } catch(e) {
        console.error("Failed to read book content from localstorage", e);
      }
    }
    
    return bookFromState;
  };

  const value = { books, addBook, updateBook, deleteBook, findBookById };

  return (
    <BookLibraryContext.Provider value={value}>
      {children}
    </BookLibraryContext.Provider>
  );
}
