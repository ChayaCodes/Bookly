
"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import { getArrayBufferFromStorage } from '@/app/actions';
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Book } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EpubViewer, type EpubViewerRef } from '@/components/book/epub-viewer';
import { TextViewer } from '@/components/book/text-viewer';

export default function BookReaderPage() {
    const router = useRouter();
    const params = useParams();
    const { findBookById } = useBookLibrary();
    const [book, setBook] = useState<Book | null>(null);
    const [fileContent, setFileContent] = useState<ArrayBuffer | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const epubViewerRef = useRef<EpubViewerRef>(null);

    useEffect(() => {
        const bookId = params.id as string;
        if (!bookId) return;

        const fetchBookAndContent = async () => {
            try {
                setIsLoading(true);
                setError(null);
                
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
        };

        fetchBookAndContent();
    }, [params.id, findBookById]);

    const goBack = () => {
        router.push(`/books/${params.id}`);
    }

    const renderBookContent = () => {
        if (!book || !fileContent) return null;

        switch(book.type) {
            case 'epub':
                return (
                    <div className="relative w-full h-full flex-1 flex items-center justify-center">
                        <EpubViewer ref={epubViewerRef} fileContent={fileContent} />
                        <Button variant="ghost" size="icon" className="absolute left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full" onClick={() => epubViewerRef.current?.prevPage()}>
                            <ChevronLeft className="h-6 w-6" />
                        </Button>
                        <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full" onClick={() => epubViewerRef.current?.nextPage()}>
                            <ChevronRight className="h-6 w-6" />
                        </Button>
                    </div>
                );
            case 'text':
                return <TextViewer fileContent={fileContent} />;
            case 'pdf':
                return <div className="text-center p-8">PDF viewer is not implemented yet.</div>;
            default:
                return <div className="text-center p-8">Unsupported book type.</div>;
        }
    }

    if (isLoading && !fileContent) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading book...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto p-2 flex items-center justify-between">
                    <Button variant="ghost" onClick={goBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Details
                    </Button>
                    <div className="text-center overflow-hidden">
                        <h1 className="font-headline text-lg font-bold truncate">{book?.title}</h1>
                    </div>
                    {/* Placeholder for future controls like font size, etc. */}
                    <div className="w-32"></div>
                </div>
            </header>
            <main className="flex-1 w-full max-w-4xl mx-auto py-4 flex flex-col">
                {error ? (
                     <Card className="max-w-3xl mx-auto mt-8">
                        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                        <CardContent><p className="text-destructive">{error}</p></CardContent>
                    </Card>
                ) : (
                   renderBookContent()
                )}
            </main>
        </div>
    );
}
