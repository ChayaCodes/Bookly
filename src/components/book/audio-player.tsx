
"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import type { Book } from '@/lib/types';
import {
  ArrowLeft,
<<<<<<< HEAD
=======
  ChevronDown,
  ChevronUp,
>>>>>>> refs/remotes/origin/main
  ListMusic,
  Pause,
  Play,
  Repeat,
  Rewind,
  FastForward,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
<<<<<<< HEAD
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
=======
>>>>>>> refs/remotes/origin/main
import { cn } from '@/lib/utils';


interface AudioPlayerProps {
    book: Book;
    chapters: { title: string; url: string }[];
}


function formatTime(seconds: number): string {
    const flooredSeconds = Math.floor(seconds);
    const h = Math.floor(flooredSeconds / 3600);
    const m = Math.floor((flooredSeconds % 3600) / 60);
    const s = flooredSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');

    if (h > 0) {
        return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${m}:${pad(s)}`;
}


export function AudioPlayer({ book, chapters }: AudioPlayerProps) {
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    
    const audioRef = useRef<HTMLAudioElement>(null);
<<<<<<< HEAD
=======
    const progressBarRef = useRef<HTMLInputElement>(null);
>>>>>>> refs/remotes/origin/main

    const currentChapter = chapters[currentChapterIndex];
    
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const setAudioData = () => setDuration(audio.duration);
        const setAudioTime = () => setCurrentTime(audio.currentTime);

        audio.addEventListener('loadeddata', setAudioData);
        audio.addEventListener('timeupdate', setAudioTime);
        
        // Autoplay next chapter
        audio.addEventListener('ended', () => {
             if (currentChapterIndex < chapters.length - 1) {
                setCurrentChapterIndex(prev => prev + 1);
            } else {
                setIsPlaying(false);
            }
        });

        if (isPlaying) {
            audio.play().catch(e => console.error("Audio play failed", e));
        } else {
            audio.pause();
        }

        return () => {
            audio.removeEventListener('loadeddata', setAudioData);
            audio.removeEventListener('timeupdate', setAudioTime);
        };
    }, [isPlaying, currentChapterIndex, chapters.length]);
    
     useEffect(() => {
        if(audioRef.current) {
            audioRef.current.playbackRate = playbackSpeed;
        }
    }, [playbackSpeed])

    useEffect(() => {
        if (audioRef.current && isPlaying) {
             audioRef.current.play().catch(e => console.error("Audio play failed on chapter change", e));
        }
    }, [currentChapterIndex, isPlaying]);


    const togglePlayPause = () => {
        setIsPlaying(!isPlaying);
    };
    
    const goToNextChapter = useCallback(() => {
        if (currentChapterIndex < chapters.length - 1) {
            setCurrentChapterIndex(currentChapterIndex + 1);
        }
    }, [currentChapterIndex, chapters.length]);
    
    const goToPrevChapter = useCallback(() => {
        if (currentChapterIndex > 0) {
            setCurrentChapterIndex(currentChapterIndex - 1);
        }
    }, [currentChapterIndex]);

    const seek = (seconds: number) => {
        if(audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    }
    
     const onScrub = (value: number) => {
        if (audioRef.current) {
            audioRef.current.currentTime = value;
            setCurrentTime(value);
        }
    };


    return (
<<<<<<< HEAD
     <TooltipProvider>
=======
>>>>>>> refs/remotes/origin/main
        <div className="flex h-screen w-screen items-center justify-center bg-muted/40 font-body">
             <audio ref={audioRef} src={currentChapter.url} preload="metadata" />
             <Card className="w-full max-w-md mx-auto shadow-2xl rounded-2xl overflow-hidden">
                <CardContent className="p-6 space-y-4 bg-background">
                     {/* Header */}
                    <div className="flex items-center justify-between">
<<<<<<< HEAD
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" asChild>
                                     <Link href={`/books/${book.id}`}>
                                        <ArrowLeft />
                                     </Link>
                                 </Button>
                             </TooltipTrigger>
                             <TooltipContent>
                                 <p>Back to Details</p>
                             </TooltipContent>
                        </Tooltip>
=======
                         <Button variant="ghost" size="icon" asChild>
                             <Link href={`/books/${book.id}`}>
                                <ArrowLeft />
                             </Link>
                         </Button>
>>>>>>> refs/remotes/origin/main
                         <div className="text-center">
                            <p className="text-sm uppercase tracking-wider text-muted-foreground">Playing From</p>
                            <p className="font-bold">{book.title}</p>
                         </div>
<<<<<<< HEAD
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon">
                                    <Volume2 />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Volume</p>
                            </TooltipContent>
                        </Tooltip>
=======
                        <Button variant="ghost" size="icon">
                            <Volume2 />
                        </Button>
>>>>>>> refs/remotes/origin/main
                    </div>
                    
                    {/* Cover Image */}
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-lg">
                        <Image src={book.coverImage || ''} alt={`Cover of ${book.title}`} layout="fill" objectFit="cover" data-ai-hint={book['data-ai-hint'] || ''} unoptimized/>
                    </div>

                    {/* Chapter Info */}
                     <div className="text-center space-y-1">
                        <h2 className="text-2xl font-bold font-headline truncate">{currentChapter.title}</h2>
                        <p className="text-muted-foreground">{book.author}</p>
                    </div>

                     {/* Progress Bar */}
                     <div className="space-y-2">
                         <Slider
                            value={[currentTime]}
                            max={duration || 100}
                            step={1}
                            onValueChange={(values) => onScrub(values[0])}
                            className="w-full"
                        />
                         <div className="flex justify-between text-xs font-mono text-muted-foreground">
                            <span>{formatTime(currentTime)}</span>
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>

                     {/* Main Controls */}
                     <div className="flex items-center justify-center gap-4">
<<<<<<< HEAD
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => seek(-15)}>
                                    <Rewind className="h-6 w-6" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Rewind 15s</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-16 w-16" onClick={goToPrevChapter} disabled={currentChapterIndex === 0}>
                                    <SkipBack className="h-8 w-8" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Previous Chapter</p>
                            </TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="icon" className="h-20 w-20 rounded-full shadow-lg" onClick={togglePlayPause}>
                                    {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{isPlaying ? "Pause" : "Play"}</p>
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-16 w-16" onClick={goToNextChapter} disabled={currentChapterIndex === chapters.length - 1}>
                                    <SkipForward className="h-8 w-8" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Next Chapter</p>
                            </TooltipContent>
                        </Tooltip>
                         <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => seek(15)}>
                                    <FastForward className="h-6 w-6" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Fast Forward 15s</p>
                            </TooltipContent>
                        </Tooltip>
=======
                         <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => seek(-15)}>
                            <Rewind className="h-6 w-6" />
                        </Button>
                         <Button variant="ghost" size="icon" className="h-16 w-16" onClick={goToPrevChapter} disabled={currentChapterIndex === 0}>
                            <SkipBack className="h-8 w-8" />
                        </Button>
                        <Button size="icon" className="h-20 w-20 rounded-full shadow-lg" onClick={togglePlayPause}>
                            {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-16 w-16" onClick={goToNextChapter} disabled={currentChapterIndex === chapters.length - 1}>
                            <SkipForward className="h-8 w-8" />
                        </Button>
                         <Button variant="ghost" size="icon" className="h-12 w-12" onClick={() => seek(15)}>
                            <FastForward className="h-6 w-6" />
                        </Button>
>>>>>>> refs/remotes/origin/main
                    </div>

                    {/* Bottom Controls */}
                    <div className="flex items-center justify-between text-muted-foreground">
                       <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="rounded-full w-20">
                                    {playbackSpeed}x
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="center">
                                {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                                     <DropdownMenuItem key={speed} onSelect={() => setPlaybackSpeed(speed)}>
                                        {speed}x
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        <Collapsible className="w-full">
                             <CollapsibleTrigger asChild>
                                 <Button variant="ghost" className="w-full">
                                    <ListMusic className="mr-2 h-4 w-4" /> Playlist ({currentChapterIndex + 1} / {chapters.length})
                                </Button>
                            </CollapsibleTrigger>
                             <CollapsibleContent className="px-2">
                                <div className="max-h-32 overflow-y-auto space-y-1 mt-2 border-t pt-2">
                                    {chapters.map((chapter, index) => (
                                         <button
                                            key={index}
                                            onClick={() => setCurrentChapterIndex(index)}
                                            className={cn("w-full text-left p-2 rounded-md text-sm hover:bg-muted", currentChapterIndex === index && "bg-muted font-bold")}
                                        >
                                           {index + 1}. {chapter.title}
                                        </button>
                                    ))}
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
<<<<<<< HEAD
                        <Tooltip>
                            <TooltipTrigger asChild>
                                 <Button variant="ghost" size="icon" className="rounded-full">
                                    <Repeat className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Repeat</p>
                            </TooltipContent>
                        </Tooltip>
=======
                         <Button variant="ghost" size="icon" className="rounded-full">
                            <Repeat className="h-4 w-4" />
                        </Button>
>>>>>>> refs/remotes/origin/main
                    </div>
                </CardContent>
            </Card>
        </div>
<<<<<<< HEAD
    </TooltipProvider>
    );
}
=======
    );
}

    
>>>>>>> refs/remotes/origin/main
