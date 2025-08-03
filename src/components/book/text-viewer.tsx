
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface TextViewerProps {
    fileContent: ArrayBuffer;
}

export function TextViewer({ fileContent }: TextViewerProps) {
    const [text, setText] = useState('');

    useEffect(() => {
        try {
            const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
            const decodedText = decoder.decode(fileContent);
            setText(decodedText);
        } catch (e) {
            console.error("Failed to decode text file:", e);
            setText("Error: Could not display this file as text.");
        }
    }, [fileContent]);

    return (
        <div className="w-full h-full p-4 sm:p-6 lg:p-8 bg-card rounded-lg shadow-sm overflow-y-auto" style={{height: 'calc(100vh - 10rem)'}}>
            <pre className="whitespace-pre-wrap font-code text-base sm:text-lg leading-relaxed">
                {text}
            </pre>
        </div>
    );
}
