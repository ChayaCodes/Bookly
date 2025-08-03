"use client";

import React, { useEffect, useRef, useState } from 'react';
import ePub, { type Book } from 'epubjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

interface EpubViewerProps {
    fileContent: ArrayBuffer;
}

export function EpubViewer({ fileContent }: EpubViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (viewerRef.current && fileContent) {
            const book = ePub(fileContent);
            bookRef.current = book;
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                flow: 'paginated', // or 'scrolled'
                spread: 'auto',
            });

            rendition.display().then(() => {
                setIsLoading(false);
            });

            return () => {
                book.destroy();
            };
        }
    }, [fileContent]);

    const goPrev = () => {
        bookRef.current?.rendition.prev();
    };

    const goNext = () => {
        bookRef.current?.rendition.next();
    };

    return (
        <div className="relative w-full h-full flex flex-col items-center">
            {isLoading && <p>Loading EPUB...</p>}
            <div ref={viewerRef} className="w-full flex-grow" style={{height: 'calc(100vh - 150px)'}}></div>
            <div className="absolute bottom-4 flex gap-4">
                <Button onClick={goPrev} variant="outline" size="icon">
                    <ChevronLeft />
                </Button>
                <Button onClick={goNext} variant="outline" size="icon">
                    <ChevronRight />
                </Button>
            </div>
        </div>
    );
}
