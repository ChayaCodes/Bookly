import { GenerateBookMetadataOutput } from "@/ai/flows/generate-book-metadata";

export interface Book {
  id: string; // Document ID in Firestore
  type: 'text' | 'audio';
  title: string;
  author: string;
  coverImage?: string; // URL for the image
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

export interface PendingBook {
    file: File;
    fileDataUrl: string; // Used for actual file upload
    metadata: Partial<GenerateBookMetadataOutput> & { title: string }; // Title is mandatory
    coverPreviewUrl?: string; // Used for client-side preview (can be blob or data URL)
}
