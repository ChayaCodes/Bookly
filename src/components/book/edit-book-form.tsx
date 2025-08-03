"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book, PendingBook } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Card, CardContent } from '../ui/card';
import { saveBookAction } from '@/app/actions';
import { Loader2, Upload } from 'lucide-react';

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  author: z.string().min(1, 'Author is required.'),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type EditBookFormProps = {
    book: Partial<Book> | PendingBook; 
    isNewBook: boolean;
}

export function EditBookForm({ book, isNewBook }: EditBookFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(
      isNewBook 
      ? (book as PendingBook).coverPreviewUrl || 'https://placehold.co/400x600/9ca3da/2a2e45?text=Generating...' 
      : (book as Book).coverImage || 'https://placehold.co/400x600'
  );
  const [newCoverFile, setNewCoverFile] = React.useState<File | null>(null);

  const { updateBook, refreshBooks, setPendingBook } = useBookLibrary();
  const { toast } = useToast();
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const getInitialValues = () => {
    if (isNewBook) {
        const pendingBook = book as PendingBook;
        return {
            title: pendingBook.metadata.title || '',
            author: pendingBook.metadata.author || '',
            description: pendingBook.metadata.description || '',
            tags: pendingBook.metadata.tags?.join(', ') || '',
        }
    }
    const existingBook = book as Book;
    return {
        title: existingBook.title,
        author: existingBook.author,
        description: existingBook.description,
        tags: existingBook.tags?.join(', ') || '',
    }
  }

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: getInitialValues(),
  });

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setNewCoverFile(file);
          const reader = new FileReader();
          reader.onloadend = () => {
              setCoverPreview(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSaving(true);
    if (isNewBook) {
        const pendingBook = book as PendingBook;
        try {
            toast({ title: 'Saving Book...', description: 'Uploading file and saving details.' });
            
            let coverDataUrl = (book as PendingBook).coverPreviewUrl || null;
            // If user selected a new cover, convert it to dataURL
            if(newCoverFile) {
                coverDataUrl = await fileToDataURL(newCoverFile);
            }

            const result = await saveBookAction({
                ...data,
                tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
                'data-ai-hint': pendingBook.metadata['data-ai-hint'] || 'book cover',
                fileDataUrl: pendingBook.fileDataUrl,
                fileName: pendingBook.file.name,
                coverDataUrl: coverDataUrl,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            toast({ title: 'Book Added!', description: `"${data.title}" is now in your library.` });
            setPendingBook(null);
            refreshBooks();
            router.push('/');

        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Save Failed', description: `Could not save book: ${e.message}` });
             setIsSaving(false);
        }
    } else {
        const existingBook = book as Book;
        try {
            let coverDataUrl: string | null = null;
            if (newCoverFile) {
                coverDataUrl = await fileToDataURL(newCoverFile);
            }
            
            const updatedBook: Partial<Book> & {id: string, coverDataUrl?: string | null} = {
              id: existingBook.id!,
              title: data.title,
              author: data.author,
              description: data.description || '',
              tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
              coverDataUrl: coverDataUrl
            };

            await updateBook(updatedBook);
            
            toast({
              title: 'Book Updated',
              description: `"${data.title}" has been successfully updated.`,
            });
            
            router.push(`/books/${existingBook.id}`);

        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: `Could not update book: ${e.message}`
            });
            setIsSaving(false);
        }
    }
  }

  const handleCancel = () => {
      if (isNewBook) {
          setPendingBook(null);
      }
      router.back();
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
            <FormLabel>Cover Image</FormLabel>
            <Card>
                <CardContent className="p-2">
                    <div className="relative aspect-[2/3] w-full">
                        <Image src={coverPreview || 'https://placehold.co/400x600'} alt="Cover preview" fill objectFit="cover" className="rounded-md" unoptimized/>
                    </div>
                </CardContent>
            </Card>
             <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
                <Upload className="mr-2 h-4 w-4" />
                Upload New Cover
            </Button>
            <Input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleCoverChange}
            />
            <p className="text-xs text-muted-foreground">
                {isNewBook && !coverPreview ? "A cover will be generated by AI if one isn't extracted or uploaded." : ""}
            </p>
        </div>

        <div className="md:col-span-2 space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea className="resize-y h-24" {...field} disabled={isSaving}/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags (comma-separated)</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isSaving} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
        <div className="md:col-span-3 flex justify-end gap-2">
             <Button type="button" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                Cancel
             </Button>
             <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : isNewBook ? (
                  'Save and Add to Library'
                ) : (
                  'Save Changes'
                )}
             </Button>
        </div>
      </form>
    </Form>
  );

  return formContent;
}
