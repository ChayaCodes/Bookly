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
import { Loader2, Upload } from 'lucide-react';

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  author: z.string().min(1, 'Author is required.'),
  description: z.string().optional(),
  tags: z.string().optional(),
  language: z.string().min(1, 'Language is required.'),
});

type EditBookFormProps = {
    book: (Partial<Book> & {id: string}) | (PendingBook & {id: string}); 
    isNewBook: boolean;
}

export function EditBookForm({ book, isNewBook }: EditBookFormProps) {
  const [isSaving, setIsSaving] = React.useState(false);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(
      isNewBook 
      ? (book as PendingBook).coverPreviewUrl || null 
      : (book as Book).coverImage || null
  );
  const [newCoverFile, setNewCoverFile] = React.useState<File | null>(null);

  const { updateBook, setPendingBook, addBook } = useBookLibrary();
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
            language: pendingBook.metadata.language || 'English',
        }
    }
    const existingBook = book as Book;
    return {
        title: existingBook.title,
        author: existingBook.author,
        description: existingBook.description,
        tags: existingBook.tags?.join(', ') || '',
        language: existingBook.language || 'English'
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
        reader.onloadend = () => {
            const result = reader.result as string;
            resolve(result);
        }
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    setIsSaving(true);
    if (isNewBook) {
        const pendingBook = book as PendingBook & { id: string };
        
        let finalCoverUrl = pendingBook.coverPreviewUrl || null;
        if (newCoverFile) {
            finalCoverUrl = await fileToDataURL(newCoverFile);
        }
        
        const newBookData: Book = {
            ...data,
            id: pendingBook.id,
            type: pendingBook.type,
            tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
            'data-ai-hint': pendingBook.metadata['data-ai-hint'] || 'book cover',
            createdAt: Date.now(),
            readingProgress: 0,
            status: 'processing', // New status
            coverImage: finalCoverUrl, // Use local URL for immediate display
            // Store file content locally for offline access
            localFile: pendingBook.file,
        };

        try {
            await addBook(newBookData);
            toast({ title: "Book is being added!", description: "It will appear in your library shortly."});
            router.push('/');
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Save Failed', description: `Could not add book: ${e.message}` });
            setIsSaving(false);
        }

    } else {
        const existingBook = book as Book;
        try {
            let coverUploadUrl: string | undefined = undefined;
            if (newCoverFile) {
                coverUploadUrl = await fileToDataURL(newCoverFile);
            }
            
            const updatedBook: Partial<Book> & {id: string} = {
              id: existingBook.id!,
              title: data.title,
              author: data.author,
              description: data.description || '',
              language: data.language,
              tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
              coverImage: coverUploadUrl, // Will be handled by updateBook
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

  const CoverImage = () => {
    if (coverPreview) {
        return <Image src={coverPreview} alt="Cover preview" layout="fill" objectFit="cover" className="rounded-md" unoptimized/>
    }
    if( (book as PendingBook).type === 'audio' ){
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground p-4 text-center">
                <p className="text-sm font-medium">Audio Book</p>
                <p className="text-xs">You can add a cover image.</p>
            </div>
        )
    }
    return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted rounded-md text-muted-foreground p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-2"/>
            <p className="text-sm font-medium">Generating Cover...</p>
            <p className="text-xs">AI is creating a cover. You can also upload your own.</p>
        </div>
    )
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-4">
            <FormLabel>Cover Image</FormLabel>
            <Card>
                <CardContent className="p-2">
                    <div className="relative aspect-[2/3] w-full">
                       <CoverImage />
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
                {isNewBook && !(book as PendingBook).coverPreviewUrl && (book as Pending-Book).type !== 'audio'
                    ? "A cover will be generated by AI if one isn't extracted or uploaded."
                    : ""
                }
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
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
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
