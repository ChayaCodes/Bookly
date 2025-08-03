"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import { EditBookForm } from '@/components/book/edit-book-form';
import { Loader2 } from 'lucide-react';

export default function NewBookPage() {
  const router = useRouter();
  const { pendingBook } = useBookLibrary();

  useEffect(() => {
    // If there's no pending book, the user shouldn't be on this page.
    if (!pendingBook) {
      router.replace('/');
    }
  }, [pendingBook, router]);

  if (!pendingBook) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-4">Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-3xl mx-auto">
            <h1 className="font-headline text-3xl font-bold mb-6">Review and Save New Book</h1>
            <p className="text-muted-foreground mb-6">
                Review the AI-generated details below. You can make any corrections before saving the book to your library.
            </p>
            <EditBookForm book={pendingBook} isNewBook={true} />
        </div>
      </div>
    </div>
  );
}
