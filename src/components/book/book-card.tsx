"use client";

import type { Book } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Headphones } from 'lucide-react';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  const hasAudio = book.type === 'audio' || !!book.audioStoragePath;
  const hasText = !!book.storagePath && book.type !== 'audio';
  // For now, we assume a single progress. If separate progress is tracked later, logic can be added here.
  const displayProgress = book.readingProgress; 

  return (
    <Link href={`/books/${book.id}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="relative aspect-[2/3] w-full">
            <Image
              src={book.coverImage as string}
              alt={`Cover of ${book.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              data-ai-hint={book['data-ai-hint'] as string | undefined}
              unoptimized
            />
            
            <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-full bg-black/60 p-1.5 text-white backdrop-blur-sm">
                {hasText && <BookOpen size={16} />}
                {hasAudio && <Headphones size={16} />}
            </div>

            {displayProgress > 0 && (
              <div className="absolute bottom-0 w-full p-2 bg-black/60 backdrop-blur-sm">
                <Progress value={displayProgress} className="h-1.5" />
              </div>
            )}
          </div>
          <div className="p-3">
            <h3 className="font-semibold truncate font-headline text-md" title={book.title}>
              {book.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate" title={book.author}>
              {book.author}
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
