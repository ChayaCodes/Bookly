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
import { generateMetadataAction, uploadBookAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Book } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';


// Helper to convert a file to a Base64 data URL
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


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

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      const file = data.file;
      const bookId = uuidv4();
      
      try {
        toast({
          title: 'Reading File...',
          description: `Preparing "${file.name}" for upload.`,
        });

        const fileDataUrl = await fileToDataURL(file);

        toast({
          title: 'Starting Upload...',
          description: `Please wait while the file is being uploaded.`,
        });

        const uploadResult = await uploadBookAction({
            bookId: bookId,
            fileName: file.name,
            fileDataUrl: fileDataUrl,
        });

        if (uploadResult.error || !uploadResult.storagePath) {
             toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: uploadResult.error || 'An unknown error occurred during upload.'
             });
             return;
        }

        const storagePath = uploadResult.storagePath;

        let initialBook: Omit<Book, 'id'|'createdAt'> = {
          type: 'text',
          title: file.name.replace(/\.[^/.]+$/, ""), // Filename w/o extension
          author: 'Unknown',
          description: 'Processing for metadata...',
          tags: [],
          coverImage: `https://placehold.co/400x600/9ca3da/2a2e45?text=Processing`,
          'data-ai-hint': 'book cover',
          language: 'English',
          readingProgress: 0,
          storagePath: storagePath,
        };

        await addBook({ ...initialBook, id: bookId });
        
        toast({
          title: 'Upload Complete!',
          description: `"${initialBook.title}" is now being processed by AI.`,
        });

        form.reset();
        setIsOpen(false);
        
        generateMetadataAction({ bookId: bookId, storagePath: storagePath })
          .then(result => {
             if (result.error) {
                 toast({
                     variant: 'destructive',
                     title: 'AI Processing Failed',
                     description: result.error,
                 });
                 updateBook({ id: bookId, description: `AI processing failed. ${result.error}`})
             } else {
                  toast({
                      title: 'AI Update Complete',
                      description: `"${result.data?.title || initialBook.title}" has been enhanced.`,
                  });
             }
          });

      } catch (error) {
        console.error("Error in upload process:", error);
        toast({
          variant: 'destructive',
          title: 'Operation Failed',
          description: error instanceof Error ? error.message : 'An unexpected error occurred.',
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
