"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Sparkles } from 'lucide-react';
import { useBookLibrary } from '@/hooks/use-book-library';
import { generateMetadataAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';

const FormSchema = z.object({
  bookText: z.string().min(200, {
    message: 'Book content must be at least 200 characters to extract metadata.',
  }),
});

export function AddBookDialog({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const { addBook } = useBookLibrary();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      bookText: '',
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    startTransition(async () => {
      const result = await generateMetadataAction({ bookText: data.bookText });
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
          content: data.bookText,
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
    });
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center gap-2">
            <Sparkles className="text-primary w-5 h-5" />
            Add New Book with AI
          </DialogTitle>
          <DialogDescription>
            Paste the full text of a book below. We'll automatically extract its title, author, and other details.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="bookText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Book Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste the entire book content here..."
                      className="min-h-[200px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={isPending} className="w-full">
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
