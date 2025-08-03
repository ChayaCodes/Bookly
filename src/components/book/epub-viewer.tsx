"use client";

import React, { useEffect, useRef, useState } from 'react';
import ePub, { type Book } from 'epubjs';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

interface EpubViewerProps {
    fileContent: ArrayBuffer;
}

export function EpubViewer({ fileContent }: EpubViewerProps) {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { theme } = useTheme();

    useEffect(() => {
        if (viewerRef.current && fileContent) {
            setIsLoading(true);
            const book = ePub(fileContent);
            bookRef.current = book;

            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                flow: 'scrolled-doc', // Use scrolled mode for better compatibility
                manager: "continuous"
            });

            const setRenditionTheme = (currentTheme: string | undefined) => {
                const newTheme = {
                    body: { 
                        'background': currentTheme === 'dark' ? '#111827' : '#FFFFFF',
                        'color': currentTheme === 'dark' ? '#E5E7EB' : '#1F2937' 
                    }
                };
                rendition.themes.register('custom', newTheme);
                rendition.themes.select('custom');
            }

            rendition.display().then(() => {
                setIsLoading(false);
                setRenditionTheme(theme);
            });

            // Update theme when next-themes changes
            rendition.themes.fontSize("18px");

            return () => {
                book.destroy();
            };
        }
    }, [fileContent, theme]); // Rerun effect if file or theme changes

    return (
        <div className="w-full h-full relative">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <p className="mt-4 text-lg">Unpacking your book...</p>
                </div>
            )}
            <div ref={viewerRef} className="w-full h-full" style={{height: 'calc(100vh - 8rem)'}} />
        </div>
    );
}
