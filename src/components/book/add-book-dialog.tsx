
"use client";

import * as React from 'react';
import ePub from 'epubjs';
import * as pdfjsLib from 'pdfjs-dist';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, UploadCloud } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { PendingBook } from '@/lib/types';
import { extractMetadataAction } from '@/app/actions';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;


// Function to read file as ArrayBuffer
const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
};

// Function to read file as Data URL
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// Heuristic to determine file type
const getBookType = (file: File): 'epub' | 'pdf' | 'text' => {
    if (file.type === 'application/epub+zip') return 'epub';
    if (file.type === 'application/pdf') return 'pdf';
    // Default to text for others like .txt, .md
    return 'text';
}


const FormSchema = z.object({
  file: z.instanceof(File, { message: "Please upload a file." })
    .refine(file => file.size > 0, "File cannot be empty."),
});

export function AddBookDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { setPendingBook } = useBookLibrary();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const file = data.file;
    setIsProcessing(true);
    
    try {
      const fileDataUrl = await fileToDataURL(file);
      const fileName = file.name.replace(/\.[^/.]+$/, "");
      const bookType = getBookType(file);
      
      let pendingBook: PendingBook = {
        file,
        fileDataUrl,
        type: bookType,
        metadata: { title: fileName } // Default title
      };
      
      let textContentForAI = '';

      if (bookType === 'epub') {
          const arrayBuffer = await fileToArrayBuffer(file);
          const book = ePub(arrayBuffer);
          const metadata = await book.loaded.metadata;
          const coverUrl = await book.coverUrl();

          pendingBook.metadata.title = metadata.title || fileName;
          pendingBook.metadata.author = metadata.creator || 'Unknown';
          pendingBook.metadata.description = metadata.description || '';
          if (coverUrl) {
            const coverBlob = await fetch(coverUrl).then(r => r.blob());
            pendingBook.coverPreviewUrl = await fileToDataURL(new File([coverBlob], 'cover.png', {type: coverBlob.type}));
          }

      } else if (bookType === 'pdf') {
          const arrayBuffer = await fileToArrayBuffer(file);
          const pdf = await pdfjsLib.getDocument({data: arrayBuffer}).promise;
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 1.5 });
          const canvas = document.createElement('canvas');
          canvas.height = viewport.height;
          canvas.width = viewport.width;
          const context = canvas.getContext('2d')!;
          await page.render({ canvasContext: context, viewport }).promise;
          pendingBook.coverPreviewUrl = canvas.toDataURL();
          pendingBook.metadata.title = fileName;
          
          // Extract text for AI
          const firstPageText = await page.getTextContent();
          textContentForAI = firstPageText.items.map(item => (item as any).str).join(' ');

      } else { // TXT, MD, etc.
          textContentForAI = await file.text();
          pendingBook.metadata.title = fileName;
      }
      
      // If we have text content, call the AI for metadata enhancement
      if(textContentForAI) {
        const result = await extractMetadataAction({ fileName: file.name, fileText: textContentForAI });
        if (!result.error && result.data) {
           // Merge AI data with existing data, giving precedence to already extracted data
           pendingBook.metadata.title = pendingBook.metadata.title || result.data.title;
           pendingBook.metadata.author = pendingBook.metadata.author || result.data.author;
           pendingBook.metadata.description = pendingBook.metadata.description || result.data.description;
           pendingBook.metadata.tags = result.data.tags;
           pendingBook.metadata['data-ai-hint'] = result.data['data-ai-hint'];
        } else if (result.error) {
            toast({ variant: 'destructive', title: 'AI Processing Failed', description: result.error });
        }
      }
      
      setPendingBook(pendingBook);
      setIsOpen(false);
      router.push('/books/new');

    } catch (error) {
      console.error("Error in processing:", error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
        setIsProcessing(false);
        form.reset();
    }
  }
  
  const handleOpenChange = (open: boolean) => {
    if (isProcessing) return;
    setIsOpen(open);
    if (!open) {
      form.reset();
    }
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation();
  };
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      form.setValue('file', e.dataTransfer.files[0], { shouldValidate: true });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary w-5 h-5" />
            Add New Book
          </DialogTitle>
          <DialogDescription>
            Upload a book file (EPUB, PDF, TXT). We'll analyze it before adding to your library.
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
                      className={cn("relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDragging && "border-primary bg-muted/50", isProcessing && "cursor-not-allowed opacity-50")}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    >
                      <UploadCloud className="w-10 h-10 text-muted-foreground mb-2"/>
                      <p className="mb-2 text-sm text-muted-foreground"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                      <p className="text-xs text-muted-foreground">EPUB, PDF, TXT, etc.</p>
                      <Input
                        type="file"
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                        accept=".txt,.epub,.md,.pdf,.zip"
                        onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                        disabled={isProcessing}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                    {form.watch('file') && <div className="text-sm text-muted-foreground">File selected: {form.watch('file')?.name}</div>}
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isProcessing || !form.formState.isValid} className="w-full">
                {isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Process Book'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
