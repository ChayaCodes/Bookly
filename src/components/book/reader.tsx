
"use client";

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import { getArrayBufferFromStorage } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import type { Book } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EpubViewer, type EpubViewerRef } from '@/components/book/epub-viewer';
import { TextViewer } from './text-viewer';
import { ReaderControls } from './reader-controls';
import type { NavItem } from 'epubjs';

export function Reader() {
    const router = useRouter();
    const params = useParams();
    const { findBookById, books } = useBookLibrary();

    const [book, setBook] = useState<Book | null>(null);
    const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toc, setToc] = useState<NavItem[]>([]);
    const [currentLocation, setCurrentLocation] = useState<string>('');

    const epubViewerRef = useRef<EpubViewerRef>(null);

    const bookId = params.id as string;
    const bookIndex = books.findIndex(b => b.id === bookId);
    const prevBookId = bookIndex > 0 ? books[bookIndex - 1].id : null;
    const nextBookId = bookIndex < books.length - 1 ? books[bookIndex + 1].id : null;
    const isRtl = book?.language?.toLowerCase() === 'hebrew';

    const fetchBookAndContent = useCallback(async (id: string) => {
        try {
            setIsLoading(true);
            setError(null);
            setFileContent(null);
            setBook(null);

            const foundBook = await findBookById(id);
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
        if (bookId) {
            fetchBookAndContent(bookId);
        }
    }, [bookId, fetchBookAndContent]);
    
    const handleTocSelect = useCallback((href: string) => {
        epubViewerRef.current?.goTo(href);
    }, []);

    const handlePrevPage = useCallback(() => {
        if (isRtl) epubViewerRef.current?.nextPage();
        else epubViewerRef.current?.prevPage();
    }, [isRtl]);

    const handleNextPage = useCallback(() => {
        if (isRtl) epubViewerRef.current?.prevPage();
        else epubViewerRef.current?.nextPage();
    }, [isRtl]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'ArrowRight') handleNextPage();
            else if (event.key === 'ArrowLeft') handlePrevPage();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextPage, handlePrevPage]);


    const renderBookContent = () => {
        if (!book || !fileContent) return null;

        switch(book.type) {
            case 'epub':
            case 'text': // Treat text as epub for now
                return (
                    <EpubViewer 
                        ref={epubViewerRef} 
                        fileContent={fileContent} 
                        onTocReady={setToc}
                        onLocationChange={setCurrentLocation}
                    />
                );
            case 'pdf':
                return <div className="text-center p-8 bg-card rounded-md">PDF viewer is not implemented yet.</div>;
            default:
                return <div className="text-center p-8 bg-card rounded-md">Unsupported book type.</div>;
        }
    }

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading book...</p>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <Card className="max-w-xl mx-auto">
                    <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                    <CardContent><p className="text-destructive">{error}</p></CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="h-screen w-screen bg-background text-foreground flex flex-col relative overflow-hidden">
            <div className="relative w-full h-full flex-1">
                {renderBookContent()}

                {/* Clickable areas for page turning */}
                <div className="absolute left-0 top-0 h-full w-1/4 z-10" onClick={handlePrevPage} />
                <div className="absolute right-0 top-0 h-full w-1/4 z-10" onClick={handleNextPage} />
                
                <ReaderControls 
                    title={book?.title}
                    bookId={book?.id}
                    prevBookId={prevBookId}
                    nextBookId={nextBookId}
                    toc={toc}
                    onTocSelect={handleTocSelect}
                    isRtl={isRtl}
                    onPrevClick={handlePrevPage}
                    onNextClick={handleNextPage}
                />
            </div>
        </div>
    );
}
