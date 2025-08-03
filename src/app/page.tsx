import { Library, LogIn, Plus, Search, Settings, BookHeart, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Bookshelf from '@/components/book/bookshelf';
import { AddBookDialog } from '@/components/book/add-book-dialog';
import { ThemeToggle } from '@/components/common/theme-toggle';

export default function Home() {
  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside className="hidden md:flex w-64 flex-col border-r bg-card p-4">
        <div className="flex items-center gap-2 mb-8">
          <BookHeart className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold">Bookly</h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Button variant="ghost" className="justify-start gap-2 text-md bg-accent text-accent-foreground">
            <Library className="h-5 w-5" />
            My Library
          </Button>
          <Button variant="ghost" className="justify-start gap-2 text-md">
            <Rss className="h-5 w-5" />
            Import Feeds
          </Button>
           <Button variant="ghost" className="justify-start gap-2 text-md">
            <Settings className="h-5 w-5" />
            Settings
          </Button>
        </nav>
        <div className="mt-auto">
          <div className="p-4 rounded-lg bg-accent/30 text-center">
            <p className="text-sm font-semibold">Your Ad Here</p>
            <p className="text-xs text-muted-foreground mt-1">Upgrade to Pro to remove ads.</p>
            <Button size="sm" className="mt-3 w-full">Upgrade</Button>
          </div>
        </div>
      </aside>
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-6">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input placeholder="Search your library..." className="pl-10" />
          </div>
          <div className="flex items-center gap-4">
            <AddBookDialog>
              <Button>
                <Plus className="mr-2 h-5 w-5" />
                Add Book
              </Button>
            </AddBookDialog>
            <ThemeToggle />
            <Button variant="outline" size="icon">
              <LogIn className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <h2 className="text-3xl font-headline font-bold mb-6">My Library</h2>
          <Bookshelf />
        </main>
      </div>
    </div>
  );
}
