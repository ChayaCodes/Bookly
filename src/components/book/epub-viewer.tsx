
"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef, useState } from 'react';
import ePub, { type Rendition } from 'epubjs';
import { useTheme } from 'next-themes';
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
    const { theme } = useTheme();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (viewerRef.current && fileContent) {
            setIsLoading(true);
            const book = ePub(fileContent);
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                flow: 'paginated',
                // allow script and fonts to be loaded
                allowPopups: false,
                allowScriptedContent: false,
            });
            
            renditionRef.current = rendition;

            const setRenderTheme = (currentTheme: string | undefined) => {
                 const newTheme = {
                    body: {
                        'background': currentTheme === 'dark' ? '#1f2937' : '#ffffff',
                        'color': currentTheme === 'dark' ? '#e5e7eb' : '#1f2937',
                    }
                }
                renditionRef.current?.themes.register('custom', newTheme);
                renditionRef.current?.themes.select('custom');
            }
            
            // Display the book and apply theme
            rendition.display().then(() => {
                setRenderTheme(theme);
                setIsLoading(false);
            });

            return () => {
                book.destroy();
            };
        }
    }, [fileContent]);

    // Apply theme when it changes
    useEffect(() => {
        const setRenderTheme = (currentTheme: string | undefined) => {
            if (!renditionRef.current) return;
            const newTheme = {
               body: {
                   'background': currentTheme === 'dark' ? '#1f2937' : '#ffffff', // bg-gray-800 or bg-white
                   'color': currentTheme === 'dark' ? '#e5e7eb' : '#1f2937',      // text-gray-200 or text-gray-800
               }
           }
           renditionRef.current?.themes.register('custom', newTheme);
           renditionRef.current?.themes.select('custom');
       }
       setRenderTheme(theme);

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
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}
            <div ref={viewerRef} className="w-full h-full" />
        </div>
    );
});

EpubViewer.displayName = "EpubViewer";
