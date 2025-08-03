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

const FormSchema = z.object({
  file: z.any().refine(file => file instanceof File && file.size > 0, "Please upload a file."),
});

export function AddBookDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [isDragging, setIsDragging] = React.useState(false);
  const { addBook } = useBookLibrary();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      file: undefined,
    }
  });
  
  const fileRef = form.register("file");

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      try {
        const bookText = await readFileAsText(data.file);

        if (bookText.length < 100) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: "File content is too short. It must be at least 100 characters.",
            });
            return;
        }

        const result = await generateMetadataAction({ bookText });

        if (result.error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: result.error,
          });
        } else if (result.data) {
          const newBook = {
            id: crypto.randomUUID(),
            title: result.data.title,
            author: result.data.author,
            description: result.data.description,
            tags: result.data.tags,
            coverImage: `https://placehold.co/300x450/9ca3da/2a2e45`,
            'data-ai-hint': 'book cover',
            language: 'English', // Default value
            content: bookText,
            readingProgress: 0,
          };
          addBook(newBook);
          toast({
            title: 'Success!',
            description: `"${result.data.title}" has been added to your library.`,
          });
          setIsOpen(false);
          form.reset();
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error reading file',
          description: 'Could not process the uploaded file. Please ensure it is a valid text file.',
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
            Add New Book with AI
          </DialogTitle>
          <DialogDescription>
            Upload a book file (e.g., .txt, .epub). We'll automatically extract its title, author, and other details.
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
                      <p className="text-xs text-muted-foreground">TXT, EPUB, etc. (up to 10MB)</p>
                      <Input
                        type="file"
                        className="absolute w-full h-full opacity-0 cursor-pointer"
                        accept=".txt,.epub,.md"
                        {...fileRef}
                        onChange={(e) => {
                            if (e.target.files && e.target.files.length > 0) {
                                field.onChange(e.target.files[0])
                            }
                        }}
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
                    Generating...
                  </>
                ) : (
                  'Add to Library'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
