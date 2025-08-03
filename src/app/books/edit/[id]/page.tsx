"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditBookDialog } from '@/components/book/edit-book-dialog';

export default function EditBookPage() {
  const router = useRouter();
  const params = useParams();
  const { findBookById } = useBookLibrary();
  const [book, setBook] = useState<Book | null>(null);

  useEffect(() => {
    if (params.id) {
      const foundBook = findBookById(params.id as string);
      if (foundBook) {
        setBook(foundBook);
      } else {
        // If book not found, maybe it's still being added.
        // A better UX might show a loading state and retry.
        // For now, redirect to library.
        // router.push('/');
      }
    }
  }, [params.id, findBookById, router]);

  if (!book) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Loading book details...</p>
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
            <h1 className="font-headline text-3xl font-bold mb-6">Edit Book Details</h1>
            <EditBookDialog book={book} isPage>
                {/* This is a dummy trigger, the dialog logic is used directly */}
                <div/>
            </EditBookDialog>
        </div>
      </div>
    </div>
  );
}
