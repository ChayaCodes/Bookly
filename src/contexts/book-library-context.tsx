"use client";

import * as React from 'react';
import { Book } from '@/lib/types';

interface BookLibraryContextType {
  books: Book[];
  addBook: (book: Book) => void;
  updateBook: (updatedBook: Book) => void;
  findBookById: (id: string) => Book | undefined;
}

export const BookLibraryContext = React.createContext<BookLibraryContextType | undefined>(undefined);

export function BookLibraryProvider({ children }: { children: React.ReactNode }) {
  const [books, setBooks] = React.useState<Book[]>([]);

  const addBook = (book: Book) => {
    setBooks(prevBooks => [book, ...prevBooks]);
  };

  const updateBook = (updatedBook: Book) => {
    setBooks(prevBooks =>
      prevBooks.map(book => (book.id === updatedBook.id ? updatedBook : book))
    );
  };
  
  const findBookById = (id: string) => {
    return books.find(book => book.id === id);
  };

  const value = { books, addBook, updateBook, findBookById };

  return (
    <BookLibraryContext.Provider value={value}>
      {children}
    </BookLibraryContext.Provider>
  );
}
