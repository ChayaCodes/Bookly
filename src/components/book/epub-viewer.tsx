
"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import ePub, { type Rendition, type Book, type NavItem } from 'epubjs';
import { useTheme } from 'next-themes';
import { Loader2 } from 'lucide-react';

interface EpubViewerProps {
    fileContent: ArrayBuffer;
    onTocReady: (toc: NavItem[]) => void;
    onLocationChange: (location: string) => void;
}

export interface EpubViewerRef {
    goTo: (location: string) => void;
    nextPage: () => void;
    prevPage: () => void;
}

export const EpubViewer = forwardRef<EpubViewerRef, EpubViewerProps>(({ fileContent, onTocReady, onLocationChange }, ref) => {
    const viewerRef = useRef<HTMLDivElement>(null);
    const bookRef = useRef<Book | null>(null);
    const renditionRef = useRef<Rendition | null>(null);
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!viewerRef.current || !fileContent) return;
        
        setIsLoading(true);
        const book = ePub(fileContent);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
            width: '100%',
            height: '100%',
            flow: 'paginated',
            spread: 'auto',
        });
        renditionRef.current = rendition;

        const applyTheme = (r: Rendition) => {
             const newTheme = {
                body: {
                    'background': theme === 'dark' ? '#111827' : '#ffffff', // gray-900 or white
                    'color': theme === 'dark' ? '#e5e7eb' : '#1f2937',      // gray-200 or gray-800
                    'font-family': 'sans-serif',
                    'line-height': '1.6',
                },
                p: {
                    'font-size': '1.1rem'
                },
                'a:link': {
                    'color': theme === 'dark' ? '#93c5fd' : '#2563eb' // blue-300 or blue-600
                },
            }
            r.themes.register('custom', newTheme);
            r.themes.select('custom');
        };

        book.ready.then(() => {
            onTocReady(book.navigation.toc);
        });

        rendition.on('rendered', (section: any) => {
            applyTheme(rendition);
        });
        
        rendition.on('relocated', (location: any) => {
            onLocationChange(location.start.cfi);
        });

        rendition.display().then(() => {
            applyTheme(rendition);
            setIsLoading(false);
        });

        return () => {
            book.destroy();
        };
    }, [fileContent, onTocReady, onLocationChange, theme]);
    
    useEffect(() => {
        const r = renditionRef.current;
        if (!r) return;
        const newTheme = {
            body: {
                'background': theme === 'dark' ? '#111827' : '#ffffff',
                'color': theme === 'dark' ? '#e5e7eb' : '#1f2937',
                'font-family': 'sans-serif',
                'line-height': '1.6',
            },
            p: {
                'font-size': '1.1rem'
            },
            'a:link': {
                'color': theme === 'dark' ? '#93c5fd' : '#2563eb'
            },
        }
        r.themes.register('custom', newTheme);
        r.themes.select('custom');
    }, [theme])


    useImperativeHandle(ref, () => ({
        goTo: (location: string) => {
            renditionRef.current?.display(location);
        },
        nextPage: () => {
            renditionRef.current?.next();
        },
        prevPage: () => {
            renditionRef.current?.prev();
        }
    }));

    return (
        <div className="w-full h-full relative" style={{height: 'calc(100vh - 5rem)'}}>
             {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            <div ref={viewerRef} className="w-full h-full" />
        </div>
    );
});

EpubViewer.displayName = "EpubViewer";
