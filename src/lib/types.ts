export interface Book {
  id: string; // Document ID in Firestore
  type: 'text' | 'audio';
  title: string;
  author: string;
  coverImage: string; // data: URL for the image
  'data-ai-hint'?: string;
  description: string;
  tags: string[];
  language: string;
  storagePath?: string; // Path to the original file in Firebase Storage
  audioStoragePath?: string; // Path to the generated audiobook file
  summary?: string;
  readingProgress: number; // Percentage 0-100
  createdAt: number; // Timestamp
}
