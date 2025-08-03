"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  author: z.string().min(1, 'Author is required.'),
  description: z.string().min(10, 'Description must be at least 10 characters.'),
  tags: z.string().min(1, 'At least one tag is required.'),
});

export function EditBookDialog({ book, children }: { book: Book; children: React.ReactNode }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { updateBook } = useBookLibrary();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: book.title,
      author: book.author,
      description: book.description,
      tags: book.tags.join(', '),
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    const updatedBook = {
      ...book,
      ...data,
      tags: data.tags.split(',').map(tag => tag.trim()),
    };
    updateBook(updatedBook);
    toast({
      title: 'Book Updated',
      description: `"${book.title}" has been successfully updated.`,
    });
    setIsOpen(false);
  }
  
  React.useEffect(() => {
    if (isOpen) {
      form.reset({
        title: book.title,
        author: book.author,
        description: book.description,
        tags: book.tags.join(', '),
      });
    }
  }, [isOpen, book, form]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Book Details</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
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
                    <Textarea className="resize-y" {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
