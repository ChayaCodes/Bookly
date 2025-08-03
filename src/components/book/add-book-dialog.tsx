"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { useBookLibrary } from '@/hooks/use-book-library';
import { generateMetadataAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ePub from 'epubjs';
import { useRouter } from 'next/navigation';

const FormSchema = z.object({
  file: z.instanceof(File, { message: "Please upload a file." })
    .refine(file => file.size > 0, "File cannot be empty."),
});

export function AddBookDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isDragging, setIsDragging] = React.useState(false);
  const { addBook, updateBook } = useBookLibrary();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  const readFileAsArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };
  
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase();
  }

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      try {
        const file = data.file;
        const extension = getFileExtension(file.name);
        const bookId = crypto.randomUUID();
        let bookTextContent = '';
        let coverImageUrl = `https://placehold.co/300x450/9ca3da/2a2e45`;
        
        let initialBook = {
          id: bookId,
          title: file.name.replace(/\.[^/.]+$/, ""), // Filename w/o extension
          author: 'Unknown',
          description: '',
          tags: [],
          coverImage: coverImageUrl,
          'data-ai-hint': 'book cover',
          language: 'English',
          content: '',
          readingProgress: 0,
        };

        if (extension === 'epub') {
            const arrayBuffer = await readFileAsArrayBuffer(file);
            const book = ePub(arrayBuffer);
            const metadata = await book.loaded.metadata;
            if (metadata.title) initialBook.title = metadata.title;
            if (metadata.creator) initialBook.author = metadata.creator;
            if (metadata.description) initialBook.description = metadata.description;

            const coverUrl = await book.coverUrl();
            if (coverUrl) {
                const coverImageBlob = await fetch(coverUrl).then(r => r.blob());
                initialBook.coverImage = URL.createObjectURL(coverImageBlob);
            }
            // For EPUB, getting full text can be complex, we'll do it via AI later if needed
            // For now, we add the book and navigate to edit.
        }

        // For all files, we'll try to get text content for AI processing
        try {
            bookTextContent = await readFileAsText(file);
            initialBook.content = bookTextContent;
        } catch (e) {
            console.warn("Could not read file as text:", e);
        }

        addBook(initialBook);
        toast({
          title: 'Book Added!',
          description: `"${initialBook.title}" is being processed.`,
        });
        setIsOpen(false);
        form.reset();
        router.push(`/books/edit/${bookId}`);
        
        // Asynchronous AI Processing
        if (bookTextContent.length >= 100) {
            generateMetadataAction({ bookText: bookTextContent }).then(result => {
                if (result.data) {
                    updateBook({
                        id: bookId,
                        title: result.data.title,
                        author: result.data.author,
                        description: result.data.description,
                        tags: result.data.tags,
                        // Don't overwrite existing values if AI returns nothing
                        ...Object.fromEntries(Object.entries(result.data).filter(([_, v]) => v != null)),
                    });
                     toast({
                        title: 'AI Update',
                        description: `AI has finished processing "${result.data.title}".`,
                    });
                }
                // Silently fail if AI fails, user can edit manually
            });
        }

      } catch (error) {
        console.error("Error processing book:", error);
        toast({
          variant: 'destructive',
          title: 'Error processing file',
          description: 'Could not process the uploaded file. Please check the file type and try again.',
        });
      }
    });
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      form.setValue('file', files[0], { shouldValidate: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) {
        form.reset();
      }
    }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary w-5 h-5" />
            Add New Book
          </DialogTitle>
          <DialogDescription>
            Upload a book file (EPUB, TXT, etc.). We'll try to extract its details automatically.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="file"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book File</FormLabel>
                  <FormControl>
                    <div
                      className={cn(
                        "relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                        isDragging && "border-primary bg-muted/50"
                      )}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <UploadCloud className="w-10 h-10 text-muted-foreground mb-2"/>
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">EPUB, PDF, TXT, etc. (up to 10MB)</p>
                      <Input
                        type="file"
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                        accept=".txt,.epub,.md,.pdf"
                        onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                    {form.watch('file') && (
                        <div className="text-sm text-muted-foreground">
                            File selected: {form.watch('file')?.name}
                        </div>
                    )}
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending || !form.formState.isValid} className="w-full">
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Book'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
