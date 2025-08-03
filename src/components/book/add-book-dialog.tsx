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
import { uploadBookAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useBookLibrary } from '@/hooks/use-book-library';


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
  const [isUploading, setIsUploading] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const { toast } = useToast();
  const { refreshBooks } = useBookLibrary();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    const file = data.file;
    setIsUploading(true);
    
    try {
      toast({
        title: 'Uploading Book...',
        description: `Please wait while "${file.name}" is processed.`,
      });

      const fileDataUrl = await fileToDataURL(file);

      const result = await uploadBookAction({
          fileName: file.name,
          fileDataUrl: fileDataUrl,
      });

      if ('error' in result) {
           toast({
              variant: 'destructive',
              title: 'Upload Failed',
              description: result.error || 'An unknown error occurred during upload.'
           });
      } else {
         toast({
            title: 'Upload Complete!',
            description: `"${file.name}" has been added and is being processed by AI.`,
         });
         refreshBooks(); // Manually trigger a refresh of the book list
         setIsOpen(false); // Close dialog on success
      }
      
    } catch (error) {
      console.error("Error in upload process:", error);
      toast({
        variant: 'destructive',
        title: 'Operation Failed',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
      });
    } finally {
        setIsUploading(false);
        form.reset();
    }
  }
  
  const handleOpenChange = (open: boolean) => {
    if (isUploading) return;
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
            Upload a book file (EPUB, PDF, TXT). We'll store it and process it with AI.
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
                      className={cn("relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors", isDragging && "border-primary bg-muted/50", isUploading && "cursor-not-allowed opacity-50")}
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
                        accept=".txt,.epub,.md,.pdf"
                        onChange={(e) => field.onChange(e.target.files ? e.target.files[0] : null)}
                        disabled={isUploading}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                    {form.watch('file') && <div className="text-sm text-muted-foreground">File selected: {form.watch('file')?.name}</div>}
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isUploading || !form.formState.isValid} className="w-full">
                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</> : 'Upload Book'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}