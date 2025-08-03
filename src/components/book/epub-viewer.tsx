
"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import ePub, { type Rendition } from 'epubjs';
import { Loader2 } from 'lucide-react';

interface EpubViewerProps {
    fileContent: ArrayBuffer;
}

export interface EpubViewerRef {
    nextPage: () => void;
    prevPage: () => void;
}

export const EpubViewer = forwardRef<EpubViewerRef, EpubViewerProps>(({ fileContent }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (viewerRef.current && fileContent) {
            const book = ePub(fileContent);
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                flow: 'paginated',
            });
            renditionRef.current = rendition;

            rendition.display().then(() => {
                setIsLoading(false);
            });

            return () => {
                book.destroy();
            };
        }
    }, [fileContent]);

    useImperativeHandle(ref, () => ({
        nextPage: () => {
            renditionRef.current?.next();
        },
        prevPage: () => {
            renditionRef.current?.prev();
        }
    }));


    return (
        <div className="w-full h-full relative" style={{height: 'calc(100vh - 10rem)'}}>
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="mt-4 text-lg">Unpacking your book...</p>
                </div>
            )}
            <div ref={viewerRef} className="w-full h-full" />
        </div>
    );
});

EpubViewer.displayName = "EpubViewer";
