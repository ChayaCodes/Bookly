"use client";

import { useBookLibrary } from '@/hooks/use-book-library';
import { BookCard } from './book-card';
import { AnimatePresence, motion } from 'framer-motion';

export default function Bookshelf() {
  const { books } = useBookLibrary();

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-20 border-2 border-dashed rounded-lg">
        <h3 className="text-xl font-semibold">Your library is empty</h3>
        <p className="text-muted-foreground mt-2">Add a book to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
      <AnimatePresence>
        {books.map((book, index) => (
          <motion.div
            key={book.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <BookCard book={book} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
