export interface Book {
  id: string;
  type: 'text' | 'audio';
  title: string;
  author: string;
  coverImage: string;
  'data-ai-hint'?: string;
  description: string;
  tags: string[];
  language: string;
  content: string; // Full text for text books
  audioChapters?: { title: string; audioDataUri: string }[]; // Audio data for audiobooks
  summary?: string;
  readingProgress: number; // Percentage 0-100
}
