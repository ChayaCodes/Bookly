
"use client";

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import ePub, { type Rendition } from 'epubjs';

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

    useEffect(() => {
        if (viewerRef.current && fileContent) {
            const book = ePub(fileContent);
            const rendition = book.renderTo(viewerRef.current, {
                width: '100%',
                height: '100%',
                flow: 'paginated',
            });
            rendition.display();
            
            renditionRef.current = rendition;

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
        <div className="w-full h-full" style={{height: 'calc(100vh - 10rem)'}}>
            <div ref={viewerRef} className="w-full h-full" />
        </div>
    );
});

EpubViewer.displayName = "EpubViewer";
