"use client";

import { useContext } from 'react';
import { BookLibraryContext } from '@/contexts/book-library-context';

export function useBookLibrary() {
  const context = useContext(BookLibraryContext);
  if (context === undefined) {
    throw new Error('useBookLibrary must be used within a BookLibraryProvider');
  }
  return context;
}
