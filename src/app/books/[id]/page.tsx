"use client";

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { ArrowLeft, BookOpen, Download, Edit, Headphones, Loader2, Sparkles, Trash2, Text, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EditBookDialog } from '@/components/book/edit-book-dialog';
import { summarizeContentAction, generateAudiobookAction } from '@/app/actions';
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
  const { findBookById, deleteBook, updateBook, books } = useBookLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [isSummaryLoading, startSummaryTransition] = useTransition();
  const [isConverting, startConversionTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
      // Directly fetch the book with its content and update the state.
      // This ensures the component has the full book data.
      const foundBook = findBookById(params.id as string);
      setBook(foundBook || null);
    }
  }, [params.id, findBookById, books]); // `books` is included to refetch if the library changes.


  const handleGenerateSummary = () => {
    if (!book || !book.content) return;
    startSummaryTransition(async () => {
      const result = await summarizeContentAction({ bookContent: book.content as string });
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error,
        });
      } else if (result.data?.summary) {
        const updatedBook = { ...book, summary: result.data.summary };
        updateBook({id: book.id, summary: result.data.summary});
        setBook(updatedBook);
      }
    });
  };

  const handleCreateAudiobook = () => {
    if (!book || !book.content) {
        toast({ variant: 'destructive', title: 'Missing Content', description: "Cannot create audiobook without book content."});
        return;
    }
    startConversionTransition(async () => {
        const result = await generateAudiobookAction({ bookContent: book.content as string });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Audiobook Creation Failed', description: result.error });
        } else if (result.data) {
            const updatedBookData = { audioChapters: result.data.chapters, type: 'audio' as const };
            updateBook({id: book.id, ...updatedBookData});
            setBook(prevBook => prevBook ? {...prevBook, ...updatedBookData} : null);
            toast({ title: 'Audiobook Ready!', description: 'Your audiobook has been generated.' });
        }
    });
  };

  const handleCreateTextVersion = () => {
    // Placeholder for Speech-to-Text functionality
    startConversionTransition(async () => {
        toast({ title: 'Coming Soon!', description: 'Speech-to-text conversion is not yet available.'});
    });
  }
  
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
  
  const hasAudio = book.audioChapters && book.audioChapters.length > 0;
  const hasContent = !!book.content;

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
                {hasContent && (
                    <Button size="lg" className="w-full font-bold">
                        <BookOpen className="mr-2 h-5 w-5" />
                        Read Now
                    </Button>
                )}
                {hasAudio && (
                     <Button size="lg" variant={hasContent ? "secondary" : "default"} className="w-full font-bold">
                        <Headphones className="mr-2 h-5 w-5" />
                        Listen Now
                    </Button>
                )}
                
                {book.type === 'text' && !hasAudio && hasContent && (
                    <Button size="lg" variant="secondary" className="w-full" onClick={handleCreateAudiobook} disabled={isConverting}>
                        {isConverting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Headphones className="mr-2 h-5 w-5" />}
                        {isConverting ? 'Creating Audiobook...' : 'Create Audiobook'}
                    </Button>
                )}
                {book.type === 'audio' && !hasContent && (
                     <Button size="lg" variant="secondary" className="w-full" onClick={handleCreateTextVersion} disabled={isConverting}>
                        {isConverting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
                        {isConverting ? 'Creating Text...' : 'Create Text Version'}
                    </Button>
                )}
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
                    <Button onClick={handleGenerateSummary} disabled={isSummaryLoading || !hasContent}>
                      {isSummaryLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Summary'
                      )}
                    </Button>
                     {!hasContent && <p className="text-xs text-muted-foreground">Summary generation requires book content.</p>}
                  </div>
                )}
              </CardContent>
            </Card>

            {hasAudio && book.audioChapters && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Headphones className="text-primary w-5 h-5"/>
                            Audiobook Chapters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {book.audioChapters.map((chapter, index) => (
                            <div key={index} className="flex items-center gap-4 p-2 rounded-md bg-muted/50">
                               <p className="font-semibold flex-1">{chapter.title}</p>
                               <audio controls src={chapter.audioDataUri} className="w-full max-w-xs h-10" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

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
