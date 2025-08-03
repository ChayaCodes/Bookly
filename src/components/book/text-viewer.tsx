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
        <div className="max-w-3xl mx-auto bg-card p-6 sm:p-8 lg:p-10 rounded-lg shadow-sm mt-8">
            <pre className="whitespace-pre-wrap font-code text-lg leading-relaxed">
                {text}
            </pre>
        </div>
    );
}
