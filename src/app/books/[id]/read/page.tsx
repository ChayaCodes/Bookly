
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import { getArrayBufferFromStorage } from '@/app/actions';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Book } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EpubViewer, type EpubViewerRef } from '@/components/book/epub-viewer';

export default function BookReaderPage() {
    const router = useRouter();
    const params = useParams();
    const { findBookById, books } = useBookLibrary();
    const [book, setBook] = useState<Book | null>(null);
    const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const epubViewerRef = useRef<EpubViewerRef>(null);

    // Find next and previous books
    const bookIndex = books.findIndex(b => b.id === params.id);
    const prevBookId = bookIndex > 0 ? books[bookIndex - 1].id : null;
    const nextBookId = bookIndex < books.length - 1 ? books[bookIndex + 1].id : null;


    const fetchBookAndContent = useCallback(async (bookId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            setFileContent(null);
            setBook(null);

            const foundBook = await findBookById(bookId);
            if (!foundBook) {
                setError("Book not found.");
                return;
            }
            setBook(foundBook);

            if (!foundBook.storagePath) {
                setError("This book does not have any readable content.");
                return;
            }
            
            const buffer = await getArrayBufferFromStorage(foundBook.storagePath);
            setFileContent(buffer);

        } catch (e: any) {
            setError(`Failed to load book: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [findBookById]);

    useEffect(() => {
        const bookId = params.id as string;
        if (bookId) {
            fetchBookAndContent(bookId);
        }
    }, [params.id, fetchBookAndContent]);

    const handlePrevPage = useCallback(() => {
        epubViewerRef.current?.prevPage();
    }, []);

    const handleNextPage = useCallback(() => {
        epubViewerRef.current?.nextPage();
    }, []);

    const navigateToBook = (id: string | null) => {
        if(id) router.push(`/books/${id}/read`);
    }

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') {
                handleNextPage();
            } else if (event.key === 'ArrowLeft') {
                handlePrevPage();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleNextPage, handlePrevPage]);


    const renderBookContent = () => {
        if (!book || !fileContent) return null;

        switch(book.type) {
            case 'epub':
            case 'text':
                return (
                    <div className="relative w-full h-full flex-1 flex items-center justify-center">
                        <EpubViewer ref={epubViewerRef} fileContent={fileContent} />
                    </div>
                );
            case 'pdf':
                return <div className="text-center p-8">PDF viewer is not implemented yet.</div>;
            default:
                return <div className="text-center p-8">Unsupported book type.</div>;
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading book...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
             <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto p-2 flex items-center justify-between">
                    <Button variant="ghost" onClick={() => router.push(`/books/${params.id}`)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Details
                    </Button>
                    <div className="text-center overflow-hidden px-4">
                        <h1 className="font-headline text-lg font-bold truncate">{book?.title}</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => navigateToBook(prevBookId)} disabled={!prevBookId}>
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => navigateToBook(nextBookId)} disabled={!nextBookId}>
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto py-4 flex flex-col relative">
                {error ? (
                     <Card className="max-w-3xl mx-auto mt-8">
                        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                        <CardContent><p className="text-destructive">{error}</p></CardContent>
                    </Card>
                ) : (
                   renderBookContent()
                )}
                 {fileContent && (
                    <>
                        <div className="absolute left-0 top-0 h-full w-1/4 z-10 cursor-pointer" onClick={handlePrevPage} />
                        <div className="absolute right-0 top-0 h-full w-1/4 z-10 cursor-pointer" onClick={handleNextPage} />
                    </>
                 )}
            </main>
        </div>
    );
}

