
"use client";

import React from 'react';
import Link from 'next/link';
import type { NavItem } from 'epubjs';
import { ArrowLeft, ChevronLeft, ChevronRight, List, Settings, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from '../ui/scroll-area';

interface ReaderControlsProps {
    title?: string;
    bookId?: string;
    prevChapterAvailable: boolean;
    nextChapterAvailable: boolean;
    onPrevChapterClick: () => void;
    onNextChapterClick: () => void;
    toc: NavItem[];
    onTocSelect: (href: string) => void;
    isRtl: boolean;
    onPrevPageClick: () => void;
    onNextPageClick: () => void;
    onFullscreenClick: () => void;
    isFullscreen: boolean;
}

export function ReaderControls({
    title,
    bookId,
    prevChapterAvailable,
    nextChapterAvailable,
    onPrevChapterClick,
    onNextChapterClick,
    toc,
    onTocSelect,
    isRtl,
    onPrevPageClick,
    onNextPageClick,
    onFullscreenClick,
    isFullscreen,
}: ReaderControlsProps) {

    const NextPageButton = () => (
        <Button variant="ghost" size="icon" onClick={onNextPageClick} className="rounded-full h-12 w-12 bg-black/20 hover:bg-black/40 text-white">
            <ChevronRight className="h-6 w-6" />
        </Button>
    );

    const PrevPageButton = () => (
        <Button variant="ghost" size="icon" onClick={onPrevPageClick} className="rounded-full h-12 w-12 bg-black/20 hover:bg-black/40 text-white">
            <ChevronLeft className="h-6 w-6" />
        </Button>
    );

    return (
        <div className="absolute inset-0 z-10 text-white p-4 group">
            {/* Overlay for mouse detection */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none bg-gradient-to-t from-black/50 via-transparent to-black/50" />
            
            {/* Header Controls */}
            <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <Button variant="ghost" asChild className="text-white hover:bg-white/20 hover:text-white">
                    <Link href={`/books/${bookId}`}>
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back to Details
                    </Link>
                </Button>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" disabled={!prevChapterAvailable} onClick={onPrevChapterClick} className="text-white hover:bg-white/20 hover:text-white">
                         <ChevronLeft className="h-5 w-5" />
                    </Button>
                     <p className="text-sm font-bold text-center w-48 truncate">{title}</p>
                     <Button variant="ghost" size="icon" disabled={!nextChapterAvailable} onClick={onNextChapterClick} className="text-white hover:bg-white/20 hover:text-white">
                        <ChevronRight className="h-5 w-5" />
                    </Button>
                </div>
                <div className="w-[150px] flex justify-end">
                    <Button variant="ghost" size="icon" onClick={onFullscreenClick} className="text-white hover:bg-white/20 hover:text-white">
                       {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {/* Left/Right Page Turn Buttons */}
             <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {isRtl ? <NextPageButton /> : <PrevPageButton />}
            </div>
             <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {isRtl ? <PrevPageButton /> : <NextPageButton />}
            </div>

            {/* Footer Controls */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                            <List className="mr-2 h-5 w-5" /> Chapters
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="bg-background" align="center">
                        <ScrollArea className="h-72 w-56">
                        {toc.map((item, index) => (
                            <DropdownMenuItem key={index} onSelect={() => onTocSelect(item.href)}>
                                {item.label.trim()}
                            </DropdownMenuItem>
                        ))}
                        </ScrollArea>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white">
                    <Settings className="mr-2 h-5 w-5" /> Display Settings
                </Button>
            </div>
        </div>
    )
}
