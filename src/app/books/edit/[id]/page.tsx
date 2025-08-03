"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditBookForm } from '@/components/book/edit-book-form';

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const { findBookById } = useBookLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
        findBookById(params.id as string).then(foundBook => {
            if (foundBook) {
                setBook(foundBook);
            } else {
                // Handle case where book is not found
                // maybe redirect or show a not found message
            }
            setIsLoading(false);
        });
    }
  }, [params.id, findBookById]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Loading book details...</p>
      </div>
    );
  }

  if (!book) {
     return (
      <div className="flex h-screen items-center justify-center">
        <p className="ml-4">Book not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="flex justify-between items-center mb-6">
            <Button variant="ghost" onClick={() => router.push(`/books/${book.id}`)} className="mb-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Book Details
            </Button>
        </div>
        
        <div className="max-w-3xl mx-auto">
            <h1 className="font-headline text-3xl font-bold mb-6">Edit '{book.title}'</h1>
            <EditBookForm book={book} isNewBook={false} />
        </div>
      </div>
    </div>
  );
}
