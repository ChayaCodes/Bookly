"use client";

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useBookLibrary } from '@/hooks/use-book-library';
import type { Book } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '../ui/card';

const FormSchema = z.object({
  title: z.string().min(1, 'Title is required.'),
  author: z.string().min(1, 'Author is required.'),
  description: z.string().optional(),
  tags: z.string().optional(),
  coverImage: z.any().optional(),
});

type EditBookDialogProps = {
    book: Book;
    children: React.ReactNode;
    isPage?: boolean;
}

// Helper to convert a file to a Base64 data URL
const fileToDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export function EditBookDialog({ book, children, isPage = false }: EditBookDialogProps) {
  const [isOpen, setIsOpen] = React.useState(isPage);
  const [coverPreview, setCoverPreview] = React.useState<string | null>(book.coverImage);
  const { updateBook } = useBookLibrary();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: book.title,
      author: book.author,
      description: book.description,
      tags: book.tags.join(', '),
      coverImage: undefined,
    },
  });

  async function onSubmit(data: z.infer<typeof FormSchema>) {
    let coverImageData = book.coverImage;
    if (data.coverImage && data.coverImage instanceof File) {
        coverImageData = await fileToDataURL(data.coverImage);
    }
    
    const updatedBook = {
      id: book.id,
      title: data.title,
      author: data.author,
      description: data.description || '',
      tags: data.tags ? data.tags.split(',').map(tag => tag.trim()).filter(t => t) : [],
      coverImage: coverImageData,
    };
    updateBook(updatedBook);
    toast({
      title: 'Book Updated',
      description: `"${book.title}" has been successfully updated.`,
    });
    
    if (isPage) {
        router.push(`/books/${book.id}`);
    } else {
        setIsOpen(false);
    }
  }

  React.useEffect(() => {
    form.reset({
        title: book.title,
        author: book.author,
        description: book.description,
        tags: book.tags.join(', '),
        coverImage: undefined,
    });
    setCoverPreview(book.coverImage);
  }, [book, form, isOpen]);

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('coverImage', file, { shouldValidate: true });
      const previewUrl = URL.createObjectURL(file);
      setCoverPreview(previewUrl);

      // Clean up the object URL after the component unmounts
      return () => URL.revokeObjectURL(previewUrl);
    }
  };
  
  const handleDialogChange = (open: boolean) => {
    if (isPage) {
        // if it's a page, redirect to library on close
        if (!open) router.push(`/books/${book.id}`);
    } else {
        setIsOpen(open);
    }
  }

  const formContent = (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column for Cover */}
        <div className="md:col-span-1 space-y-4">
             <FormField
              control={form.control}
              name="coverImage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cover Image</FormLabel>
                   <Card>
                       <CardContent className="p-2">
                           {coverPreview ? (
                            <div className="relative aspect-[2/3] w-full">
                               <Image src={coverPreview} alt="Cover preview" layout="fill" objectFit="cover" className="rounded-md" />
                            </div>
                           ) : (
                            <div className="relative aspect-[2/3] w-full bg-muted rounded-md flex items-center justify-center">
                                <span className="text-sm text-muted-foreground">No Image</span>
                            </div>
                           )}
                       </CardContent>
                   </Card>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={handleCoverChange} className="text-sm"/>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
                    <Textarea className="resize-y h-24" {...field} />
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
        </div>
        <div className="md:col-span-3">
             <Button type="submit" className="w-full">
                {isPage ? "Save and Continue" : "Save Changes"}
             </Button>
        </div>
      </form>
    </Form>
  );

  if (isPage) {
    return formContent;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Book Details</DialogTitle>
        </DialogHeader>
        <div className="py-4">
            {formContent}
        </div>
      </DialogContent>
    </Dialog>
  );
}
