"use client";

import { useEffect, useState, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { ArrowLeft, BookOpen, Download, Edit, Headphones, Loader2, Sparkles, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { summarizeContentAction, generateAudiobookAction, getArrayBufferFromStorage } from '@/app/actions';
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
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL, uploadString } from 'firebase/storage';


type AudioChapter = {
    title: string;
    audioDataUri: string;
}

export default function BookDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const { findBookById, deleteBook, updateBook } = useBookLibrary();
  const [book, setBook] = useState<Book | null>(null);
  const [isSummaryLoading, startSummaryTransition] = useTransition();
  const [isConverting, startConversionTransition] = useTransition();
  const [generatedChapters, setGeneratedChapters] = useState<AudioChapter[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (params.id) {
        findBookById(params.id as string).then(serverBook => {
          setBook(serverBook || null);
           if (serverBook?.audioStoragePath && serverBook?.type !== 'audio') {
              const audioRef = ref(storage, serverBook.audioStoragePath);
              getDownloadURL(audioRef).then(url => {
                  fetch(url).then(res => res.json()).then(data => {
                      setGeneratedChapters(data.chapters);
                  }).catch(e => console.error("Error fetching audio chapters json", e));
              }).catch(e => console.error("Error getting download URL for audio", e));
          }
        });
    }
  }, [params.id, findBookById]);


  const handleGenerateSummary = () => {
    if (!book?.storagePath) return;
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
    startConversionTransition(async () => {
        const result = await generateAudiobookAction({ storagePath: book.storagePath as string });
        if (result.error) {
            toast({ variant: 'destructive', title: 'Audiobook Creation Failed', description: result.error });
        } else if (result.data) {
            const audioJson = JSON.stringify({ chapters: result.data.chapters });
            const audioStoragePath = `audiobooks/${book.id}.json`;
            const audioRef = ref(storage, audioStoragePath);
            
            try {
              await uploadString(audioRef, audioJson, 'raw', { contentType: 'application/json' });
              const updatedBookData = { audioStoragePath: audioStoragePath };
              await updateBook({id: book.id, ...updatedBookData});
              setBook(prev => prev ? {...prev, ...updatedBookData} : null);
              setGeneratedChapters(result.data.chapters);
              toast({ title: 'Audiobook Ready!', description: 'Your audiobook has been generated successfully.' });
            } catch (e: any) {
               toast({ variant: 'destructive', title: 'Storage Error', description: `Failed to save audiobook chapters: ${e.message}` });
            }
        }
    });
  };

  const handleCreateTextVersion = () => {
    // Placeholder for Speech-to-Text functionality
    startConversionTransition(async () => {
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
                {hasAudio && (
                     <Button size="lg" variant={hasText ? "secondary" : "default"} className="w-full font-bold" asChild>
                       <Link href={`/books/${book.id}/listen`}>
                          <Headphones className="mr-2 h-5 w-5" />
                          Listen Now
                       </Link>
                    </Button>
                )}
                
                {hasText && !hasAudio && (
                    <Button size="lg" variant="secondary" className="w-full" onClick={handleCreateAudiobook} disabled={isConverting}>
                        {isConverting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Headphones className="mr-2 h-5 w-5" />}
                        {isConverting ? 'Creating Audiobook...' : 'Create Audiobook'}
                    </Button>
                )}
                {hasAudio && !hasText && book.type === 'audio' && (
                     <Button size="lg" variant="secondary" className="w-full" onClick={handleCreateTextVersion} disabled={isConverting}>
                        {isConverting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <FileText className="mr-2 h-5 w-5" />}
                        {isConverting ? 'Creating Text...' : 'Create Text Version'}
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

            {generatedChapters.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center gap-2">
                            <Headphones className="text-primary w-5 h-5"/>
                            Generated Audiobook Chapters
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {generatedChapters.map((chapter, index) => (
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
