"use client";

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { ArrowLeft, BookOpen, Download, Edit, Headphones, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditBookDialog } from '@/components/book/edit-book-dialog';
import { summarizeContentAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function BookDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { findBookById, deleteBook, updateBook } = useBookLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [isSummaryLoading, startSummaryTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      const foundBook = findBookById(params.id as string);
      if (foundBook) {
        setBook(foundBook);
      } else {
        // Handle book not found, maybe redirect
        // It might not be loaded yet, wait for the hook to provide it.
      }
    }
  }, [params.id, findBookById, router]);
  
    // This effect is needed because the book data might not be available on first render
    useEffect(() => {
        if (params.id && !book) {
            const foundBook = findBookById(params.id as string);
            if(foundBook) {
                setBook(foundBook);
            }
        }
    }, [findBookById, book, params.id])

  const handleGenerateSummary = () => {
    if (!book || !book.content) return;
    startSummaryTransition(async () => {
      const result = await summarizeContentAction({ bookContent: book.content });
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      } else if (result.data?.summary) {
        const updatedBook = { ...book, summary: result.data.summary };
        setBook(updatedBook);
        updateBook({id: book.id, summary: result.data.summary});
      }
    });
  };
  
  const handleDeleteBook = () => {
    if (!book) return;
    deleteBook(book.id);
    toast({
        title: "Book Deleted",
        description: `"${book.title}" has been removed from your library.`
    })
    router.push('/');
  }

  if (!book) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Library
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden shadow-lg">
              <CardContent className="p-0">
                <Image
                  src={book.coverImage}
                  alt={`Cover of ${book.title}`}
                  width={400}
                  height={600}
                  className="w-full object-cover"
                  data-ai-hint={book['data-ai-hint'] as string | undefined}
                />
              </CardContent>
            </Card>
            <div className="space-y-2">
              <Button size="lg" className="w-full font-bold">
                <BookOpen className="mr-2 h-5 w-5" />
                Read Now
              </Button>
              <Button size="lg" variant="secondary" className="w-full">
                <Headphones className="mr-2 h-5 w-5" />
                Listen to Audiobook
              </Button>
            </div>
             <div className="space-y-2">
                <EditBookDialog book={book}>
                    <Button variant="outline" className="w-full">
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Button>
                </EditBookDialog>
                 <Button variant="outline" className="w-full">
                     <Download className="mr-2 h-4 w-4" /> Download
                 </Button>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" className="w-full">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Book
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the book
                            "{book.title}" from your library.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteBook}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6">
            <h1 className="font-headline text-4xl font-bold">{book.title}</h1>
            <h2 className="text-xl text-muted-foreground -mt-4">by {book.author}</h2>
            
            <div className="flex flex-wrap gap-2">
              {book.tags.map(tag => (
                <Badge key={tag} variant="secondary">{tag}</Badge>
              ))}
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Reading Progress</p>
              <Progress value={book.readingProgress} className="w-full" />
            </div>

            <p className="text-foreground/90 leading-relaxed">{book.description}</p>
            
            <Card>
              <CardHeader>
                <CardTitle className="font-headline flex items-center gap-2">
                  <Sparkles className="text-primary w-5 h-5"/>
                  AI Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {book.summary ? (
                  <p className="text-muted-foreground">{book.summary}</p>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center space-y-3 p-4 border border-dashed rounded-lg">
                    <p>No summary available for this book yet.</p>
                    <Button onClick={handleGenerateSummary} disabled={isSummaryLoading || !book.content}>
                      {isSummaryLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Summary'
                      )}
                    </Button>
                     {!book.content && <p className="text-xs text-muted-foreground">Summary generation requires book content.</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-accent/20">
              <CardContent className="p-6 text-center">
                 <p className="font-bold text-accent-foreground">Advertisement</p>
                 <p className="text-sm text-muted-foreground mt-1">Enjoying Bookly? Go Pro for an ad-free experience.</p>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
