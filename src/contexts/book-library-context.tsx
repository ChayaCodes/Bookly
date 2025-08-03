"use client";

import * as React from 'react';
import type { Book } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

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
    if (isLoaded) {
        try {
            // The `books` state should NOT contain the `content` property.
            window.localStorage.setItem('books', JSON.stringify(books));
        } catch (error) {
            console.error("Error saving books to localStorage", error);
        }
    }
  }, [books, isLoaded]);

  const saveBookContent = (id: string, content: string) => {
    if (typeof window === 'undefined') return;
    try {
        const stored = window.localStorage.getItem('books_content') || '[]';
        const contents = JSON.parse(stored);
        // Avoid duplicates
        const existingIndex = contents.findIndex((item: {id: string}) => item.id === id);
        if (existingIndex > -1) {
            contents[existingIndex] = { id, content };
        } else {
            contents.push({ id, content });
        }
        window.localStorage.setItem('books_content', JSON.stringify(contents));
    } catch(e) {
        console.error("Failed to save book content to localStorage", e);
        toast({
            variant: 'destructive',
            title: 'Could not save book content',
            description: 'The book content is too large to be saved in your browser. Some features might not work correctly.'
        })
    }
  }

  const addBook = (book: Book) => {
    const { content, ...bookWithoutContent } = book;

    if (content) {
      saveBookContent(book.id, content);
    }
    
    setBooks(prevBooks => [bookWithoutContent, ...prevBooks]);
  };

  const updateBook = (updatedBook: Partial<Book> & { id: string }) => {
    // If the update contains content, save it separately
    if (updatedBook.content) {
        saveBookContent(updatedBook.id, updatedBook.content);
    }
    
    // Remove content from the object before updating the state
    const { content, ...updateWithoutContent } = updatedBook;

    setBooks(prevBooks =>
      prevBooks.map(book => 
        book.id === updateWithoutContent.id ? { ...book, ...updateWithoutContent } : book
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

    if (!bookFromState) return undefined;
    
    // Always check for content in localStorage and merge it
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
