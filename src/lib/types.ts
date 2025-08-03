export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  description: string;
  tags: string[];
  language: string;
  content: string; // The full text of the book
  summary?: string;
  readingProgress: number; // Percentage 0-100
}
