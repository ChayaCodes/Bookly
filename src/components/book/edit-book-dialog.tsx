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
import { Loader2 } from 'lucide-react';

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  author: z.string().min(1, 'Author is required.'),
  description: z.string().optional(),
  tags: z.string().optional(),
});

type EditBookFormProps = {
    // Can be a pending book (new) or an existing book (for editing later)
    book: Partial<Book> | PendingBook; 
    isNewBook: boolean;
}


export function EditBookForm({ book, isNewBook }: EditBookFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(isNewBook ? 'https://placehold.co/400x600/9ca3da/2a2e45?text=Generating...' : (book as Book).coverImage || 'https://placehold.co/400x600');
  const { updateBook, refreshBooks, setPendingBook } = useBookLibrary();
  const { toast } = useToast();
  const router = useRouter();

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

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSaving(true);
    if (isNewBook) {
        // --- SAVE NEW BOOK ---
        const pendingBook = book as PendingBook;
        try {
            toast({ title: 'Saving Book...', description: 'Uploading file and saving details.' });
            
            const result = await saveBookAction({
                ...data,
                tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
                'data-ai-hint': pendingBook.metadata['data-ai-hint'] || 'book cover',
                fileDataUrl: pendingBook.fileDataUrl,
                fileName: pendingBook.file.name,
            });

            if (result.error) {
                throw new Error(result.error);
            }

            toast({ title: 'Book Added!', description: `"${data.title}" is now in your library.` });
            setPendingBook(null); // Clear the pending book
            refreshBooks(); // Manually trigger a refresh
            router.push('/');

        } catch (e: any) {
             toast({ variant: 'destructive', title: 'Save Failed', description: `Could not save book: ${e.message}` });
             setIsSaving(false);
        }
    } else {
        // --- UPDATE EXISTING BOOK ---
        const existingBook = book as Book;
        try {
            const updatedBook: Partial<Book> & {id: string} = {
              id: existingBook.id!,
              title: data.title,
              author: data.author,
              description: data.description || '',
              tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
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
      router.push('/');
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column for Cover */}
        <div className="md:col-span-1 space-y-4">
            <FormLabel>Cover Image</FormLabel>
            <Card>
                <CardContent className="p-2">
                    {coverPreview ? (
                    <div className="relative aspect-[2/3] w-full">
                        <Image src={coverPreview} alt="Cover preview" fill objectFit="cover" className="rounded-md" unoptimized/>
                    </div>
                    ) : (
                    <div className="relative aspect-[2/3] w-full bg-muted rounded-md flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">No Image</span>
                    </div>
                    )}
                </CardContent>
            </Card>
            <p className="text-xs text-muted-foreground">
                {isNewBook ? "A cover will be generated by AI after you save the book." : "Cover editing is not yet available."}
            </p>
        </div>

        {/* Right Column for Details */}
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
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : isNewBook ? 'Save and Add to Library' : 'Save Changes'}
             </Button>
        </div>
      </form>
    </Form>
  );

  return formContent;
}
