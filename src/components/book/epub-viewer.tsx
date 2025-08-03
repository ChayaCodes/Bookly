
"use client";

import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import ePub, { type Book, type Rendition } from 'epubjs';
import { Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';

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
    const { theme } = useTheme();

    useEffect(() => {
        if (viewerRef.current && fileContent) {
            setIsLoading(true);
            const book = ePub(fileContent);
            
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                flow: 'paginated',
                manager: "default"
            });
            renditionRef.current = rendition;

            const setRenditionTheme = (currentTheme: string | undefined) => {
                if (!renditionRef.current) return;
                const newTheme = {
                    body: { 
                        'background': currentTheme === 'dark' ? '#111827' : '#FFFFFF',
                        'color': currentTheme === 'dark' ? '#E5E7EB' : '#1F2937',
                        'font-family': '"PT Sans", sans-serif',
                        'font-size': '18px', // Set default font size
                        'line-height': '1.6'
                    }
                };
                renditionRef.current.themes.register('custom', newTheme);
                renditionRef.current.themes.select('custom');
            }

            rendition.display().then(() => {
                setIsLoading(false);
                setRenditionTheme(theme);
            });

            return () => {
                book.destroy();
            };
        }
    }, [fileContent]);

     useEffect(() => {
        if (renditionRef.current) {
             const setRenditionTheme = (currentTheme: string | undefined) => {
                if (!renditionRef.current) return;
                const newTheme = {
                    body: { 
                        'background': currentTheme === 'dark' ? '#111827' : '#FFFFFF',
                        'color': currentTheme === 'dark' ? '#E5E7EB' : '#1F2937',
                        'font-family': '"PT Sans", sans-serif',
                        'font-size': '18px',
                        'line-height': '1.6'
                    }
                };
                renditionRef.current.themes.register('custom', newTheme);
                renditionRef.current.themes.select('custom');
            }
            setRenditionTheme(theme);
        }
    }, [theme]);

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
