export interface Book {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  'data-ai-hint'?: string;
  description: string;
  tags: string[];
  language: string;
  content: string; // The full text of the book, can be empty for EPUBs initially
  summary?: string;
  readingProgress: number; // Percentage 0-100
}
