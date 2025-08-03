
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book, Chapter } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import { AudioPlayer } from '@/components/book/audio-player';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '@/lib/firebase';

type ChapterWithUrl = {
    title: string;
    url: string;
}

export default function ListenPage() {
    const params = useParams();
    const router = useRouter();
    const { findBookById } = useBookLibrary();
    const [book, setBook] = useState<Book | null>(null);
    const [chapters, setChapters] = useState<ChapterWithUrl[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const bookId = params.id as string;
        if (!bookId) return;

        const loadBookAndChapters = async () => {
            setIsLoading(true);
            try {
                const bookData = await findBookById(bookId);
                if (!bookData) {
                    setError("Book not found.");
                    return;
                }
                setBook(bookData);

                if (!bookData.chapters || bookData.chapters.length === 0) {
                    setError("No audio chapters found for this book.");
                    return;
                }
                
                const chapterPromises = bookData.chapters.map(async (chapter: Chapter) => {
                    const storageRef = ref(storage, chapter.storagePath);
                    const url = await getDownloadURL(storageRef);
                    return { title: chapter.title, url };
                });

                const fetchedChapters = await Promise.all(chapterPromises);
                setChapters(fetchedChapters);

            } catch (e: any) {
                setError(`Failed to load audiobook: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadBookAndChapters();
    }, [params.id, findBookById]);


    if (isLoading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-4">Loading Audiobook...</p>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-destructive mb-4">Error</h2>
                    <p>{error}</p>
                    <button onClick={() => router.back()} className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md">Go Back</button>
                </div>
            </div>
        )
    }

    if (!book || chapters.length === 0) {
        return null; // Should be handled by loading/error states
    }

    return (
        <AudioPlayer book={book} chapters={chapters} />
    );
}

    