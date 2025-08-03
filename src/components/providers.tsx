"use client";

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes/dist/types';
import { BookLibraryProvider } from '@/contexts/book-library-context';
import { Toaster } from "@/components/ui/toaster";

export function Providers({ children, ...props }: ThemeProviderProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem {...props}>
      <BookLibraryProvider>
        {children}
        <Toaster />
      </BookLibraryProvider>
    </ThemeProvider>
  );
}
