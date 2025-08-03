"use client";

import type { Book } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface BookCardProps {
  book: Book;
}

export function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/books/${book.id}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="relative aspect-[2/3] w-full">
            <Image
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 20vw"
              data-ai-hint={book['data-ai-hint'] as string | undefined}
            />
            {book.readingProgress > 0 && (
              <div className="absolute bottom-0 w-full p-2 bg-black/50 backdrop-blur-sm">
                <Progress value={book.readingProgress} className="h-1.5" />
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
