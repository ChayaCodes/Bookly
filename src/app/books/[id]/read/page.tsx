"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import { getTextContentFromStorage } from '@/app/actions';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Book } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BookReaderPage() {
    const router = useRouter();
    const params = useParams();
    const { findBookById } = useBookLibrary();
    const [book, setBook] = useState<Book | null>(null);
    const [content, setContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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

                const textContent = await getTextContentFromStorage(foundBook.storagePath);
                setContent(textContent);

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

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading book...</p>
            </div>
        );
    }
    
    return (
        <div className="min-h-screen bg-background text-foreground">
             <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
                <div className="container mx-auto p-4 flex items-center justify-between">
                    <Button variant="ghost" onClick={goBack}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Details
                    </Button>
                    <div className="text-center">
                        <h1 className="font-headline text-xl font-bold truncate">{book?.title}</h1>
                        <p className="text-sm text-muted-foreground">{book?.author}</p>
                    </div>
                    {/* Placeholder for future controls like font size, etc. */}
                    <div className="w-24"></div>
                </div>
            </header>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
               
                {error ? (
                     <Card className="max-w-3xl mx-auto">
                        <CardHeader><CardTitle>Error</CardTitle></CardHeader>
                        <CardContent><p className="text-destructive">{error}</p></CardContent>
                    </Card>
                ) : (
                    <div className="max-w-3xl mx-auto bg-card p-6 sm:p-8 lg:p-10 rounded-lg shadow-sm">
                        <pre className="whitespace-pre-wrap font-body text-lg leading-relaxed">
                            {content}
                        </pre>
                    </div>
                )}
            </main>
        </div>
    );
}
