"use client";

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { ArrowLeft, BookOpen, Download, Edit, Headphones, Loader2, Sparkles, Trash2, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { summarizeContentAction, triggerAudiobookGenerationAction } from '@/app/actions';
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
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";


export default function BookDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { findBookById, deleteBook, updateBook } = useBookLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [isSummaryLoading, startSummaryTransition] = useTransition();
  const [isAudioLoading, startAudioTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
        findBookById(params.id as string).then(serverBook => {
          setBook(serverBook || null);
        });
    }
  }, [params.id, findBookById]);


  const handleGenerateSummary = () => {
    if (!book?.storagePath || book.type === 'audio') return;
    startSummaryTransition(async () => {
      const result = await summarizeContentAction({ storagePath: book.storagePath as string });
      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Summary Error',
          description: result.error,
        });
      } else if (result.data?.summary) {
        const updatedSummary = {id: book.id, summary: result.data.summary};
        await updateBook(updatedSummary);
        setBook(prev => prev ? {...prev, ...updatedSummary} : null);
        toast({
          title: 'Summary Generated!',
          description: 'A new AI summary has been added to this book.'
        });
      }
    });
  };
  

  const handleCreateAudiobook = () => {
    if (!book || !book.storagePath) {
        toast({ variant: 'destructive', title: 'Missing Content', description: "Cannot create audiobook without the book's text file."});
        return;
    }
    startAudioTransition(async () => {
        const result = await triggerAudiobookGenerationAction({ bookId: book.id, storagePath: book.storagePath! });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Audiobook Creation Failed', description: result.error });
        } else {
            toast({ title: 'Audiobook Generation Started!', description: 'The process is running in the background and may take a few minutes.' });
            // The UI will update automatically via the Firestore listener
        }
    });
  };

  const handleCreateTextVersion = () => {
    // Placeholder for Speech-to-Text functionality
    startAudioTransition(async () => {
        toast({ title: 'Coming Soon!', description: 'Speech-to-text conversion is not yet available.'});
    });
  }
  
  const handleDeleteBook = async () => {
    if (!book) return;
    try {
        await deleteBook(book.id);
        toast({
            title: "Book Deleted",
            description: `"${book.title}" has been removed from your library.`
        })
        router.push('/');
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: "Deletion Failed",
            description: `Could not delete "${book.title}": ${error.message}`
        })
    }
  }

  if (!book) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const hasText = !!book.storagePath && book.type !== 'audio';
  const hasAudio = !!book.chapters || book.type === 'audio';
  const isAudioReady = hasAudio && book.audioGenerationStatus === 'completed';

  const renderAudioButton = () => {
    // Case 1: Text book, no audio generation started yet
    if (hasText && !hasAudio && !book.audioGenerationStatus) {
      return (
        <Button size="lg" variant="secondary" className="w-full" onClick={handleCreateAudiobook} disabled={isAudioLoading}>
          {isAudioLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Headphones className="mr-2 h-5 w-5" />}
          {isAudioLoading ? 'Starting...' : 'Create Audiobook'}
        </Button>
      );
    }

    // Case 2: Audio generation is pending or in progress
    if (book.audioGenerationStatus === 'pending' || book.audioGenerationStatus === 'processing') {
      return (
        <Button size="lg" variant="secondary" className="w-full" disabled>
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Creating Audiobook...
        </Button>
      );
    }
    
    // Case 3: Audio generation failed
    if (book.audioGenerationStatus === 'failed') {
        return (
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button size="lg" variant="destructive" className="w-full" onClick={handleCreateAudiobook}>
                            <AlertCircle className="mr-2 h-5 w-5" />
                            Retry Audiobook Creation
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Error: {book.audioGenerationError || 'An unknown error occurred.'}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    // Case 4: Audio is ready to listen to
    if (isAudioReady) {
      return (
        <Button size="lg" variant={hasText ? "secondary" : "default"} className="w-full font-bold" asChild>
          <Link href={`/books/${book.id}/listen`}>
            <Headphones className="mr-2 h-5 w-5" />
            Listen Now
          </Link>
        </Button>
      );
    }

    return null;
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
                  src={book.coverImage as string}
                  alt={`Cover of ${book.title}`}
                  width={400}
                  height={600}
                  className="w-full object-cover"
                  data-ai-hint={book['data-ai-hint'] as string | undefined}
                  unoptimized
                />
              </CardContent>
            </Card>
            <div className="space-y-2">
                {hasText && (
                    <Button size="lg" className="w-full font-bold" asChild>
                      <Link href={`/books/${book.id}/read`}>
                        <BookOpen className="mr-2 h-5 w-5" />
                        Read Now
                      </Link>
                    </Button>
                )}
                
                {renderAudioButton()}
                
                {hasAudio && !hasText && book.type === 'audio' && (
                     <Button size="lg" variant="secondary" className="w-full" onClick={handleCreateTextVersion} disabled={isAudioLoading}>
                        {isAudioLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
                        {isAudioLoading ? 'Creating Text...' : 'Create Text Version'}
                    </Button>
                )}
            </div>
             <div className="space-y-2">
                <Button asChild variant="outline" className="w-full">
                    <Link href={`/books/edit/${book.id}`}>
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </Link>
                </Button>
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
                            "{book.title}" and its associated files from storage.
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
                    <Button onClick={handleGenerateSummary} disabled={isSummaryLoading || !hasText}>
                      {isSummaryLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        'Generate Summary'
                      )}
                    </Button>
                     {!hasText && <p className="text-xs text-muted-foreground">Summary generation requires book content.</p>}
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
