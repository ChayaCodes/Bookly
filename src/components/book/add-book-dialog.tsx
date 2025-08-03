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
import type { Book } from '@/lib/types';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from "firebase/storage";


const FormSchema = z.object({
  file: z.instanceof(File, { message: "Please upload a file." })
    .refine(file => file.size > 0, "File cannot be empty."),
});


export function AddBookDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isDragging, setIsDragging] = React.useState(false);
  const { addBook } = useBookLibrary();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      try {
        const file = data.file;
        const bookId = crypto.randomUUID();
        const storagePath = `books/${bookId}-${file.name}`;
        
        // 1. Upload the file immediately to get quick feedback
        const storageRef = ref(storage, storagePath);
        const uploadResult = await uploadBytes(storageRef, file);
        
        // 2. Add a placeholder book to Firestore
        let initialBook: Omit<Book, 'id'|'createdAt'> = {
          type: 'text',
          title: file.name.replace(/\.[^/.]+$/, ""), // Filename w/o extension
          author: 'Unknown',
          description: 'Processing...',
          tags: [],
          coverImage: `https://placehold.co/400x600/9ca3da/2a2e45?text=Processing`,
          'data-ai-hint': 'book cover',
          language: 'English',
          storagePath: uploadResult.metadata.fullPath,
          readingProgress: 0,
        };

        const addedBook = await addBook(initialBook);

        toast({
          title: 'Upload Complete!',
          description: `"${initialBook.title}" is now being processed by AI.`,
        });

        form.reset();
        setIsOpen(false);
        
        // 3. Asynchronously trigger AI processing in the background
        generateMetadataAction({ bookId: addedBook.id, storagePath: addedBook.storagePath! })
          .then(result => {
             if (result.error) {
                 toast({
                     variant: 'destructive',
                     title: 'AI Processing Failed',
                     description: result.error,
                 });
             } else {
                  toast({
                      title: 'AI Update',
                      description: `"${result.data?.title || initialBook.title}" has been enhanced by AI.`,
                  });
             }
          });

      } catch (error) {
        console.error("Error uploading book:", error);
        toast({
          variant: 'destructive',
          title: 'Error uploading file',
          description: 'Could not upload the file. Please check your connection and try again.',
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
            Upload a book file (EPUB, PDF, TXT). We'll store it in the cloud and process it with AI.
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
                      <p className="text-xs text-muted-foreground">EPUB, PDF, TXT, etc.</p>
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
                    Uploading...
                  </>
                ) : (
                  'Upload Book'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
