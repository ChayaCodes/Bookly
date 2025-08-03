
"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { getArrayBufferFromStorage } from '@/app/actions';
import { Loader2 } from 'lucide-react';
import { AudioPlayer } from '@/components/book/audio-player';

export default function ListenPage() {
    const params = useParams();
    const router = useRouter();
    const { findBookById } = useBookLibrary();
    const [book, setBook] = useState<Book | null>(null);
    const [audioFiles, setAudioFiles] = useState<{name: string, url: string}[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const bookId = params.id as string;
        if (!bookId) return;

        const loadBook = async () => {
            setIsLoading(true);
            try {
                const bookData = await findBookById(bookId);
                if (!bookData) {
                    setError("Book not found.");
                    return;
                }
                setBook(bookData);
                
                const audioPath = bookData.audioStoragePath || bookData.storagePath;
                if (!audioPath) {
                    setError("No audio source found for this book.");
                    return;
                }

                const JSZip = (await import('jszip')).default;

                const zipBase64 = await getArrayBufferFromStorage(audioPath);
                const zip = await JSZip.loadAsync(Buffer.from(zipBase64, 'base64'));
                
                const chapterPromises = Object.keys(zip.files)
                    .filter(fileName => !zip.files[fileName].dir && (fileName.toLowerCase().endsWith('.mp3') || fileName.toLowerCase().endsWith('.m4a') || fileName.toLowerCase().endsWith('.wav')))
                    .sort()
                    .map(async (fileName) => {
                        const fileData = await zip.files[fileName].async('blob');
                        const url = URL.createObjectURL(fileData);
                        return { name: fileName.replace(/\.[^/.]+$/, ""), url };
                    });

                const chapters = await Promise.all(chapterPromises);
                
                if (chapters.length === 0) {
                    setError("No valid audio files (.mp3, .m4a, .wav) were found in the uploaded ZIP file.");
                } else {
                    setAudioFiles(chapters);
                }

            } catch (e: any) {
                setError(`Failed to load audiobook: ${e.message}`);
            } finally {
                setIsLoading(false);
            }
        };

        loadBook();
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

    if (!book || audioFiles.length === 0) {
        return null; // Should be handled by loading/error states
    }

    return (
        <AudioPlayer book={book} chapters={audioFiles} />
    );
}
