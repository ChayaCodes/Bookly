import { GenerateBookMetadataOutput } from "@/ai/flows/generate-book-metadata";
import { v4 as uuidv4 } from 'uuid';


export interface Chapter {
  title: string;
  storagePath: string;
}

export interface Book {
  id: string; // Document ID in Firestore
  type: 'text' | 'audio' | 'epub' | 'pdf';
  title: string;
  author: string;
  coverImage?: string; // URL for the image (can be data URL initially)
  'data-ai-hint'?: string;
  description: string;
  tags: string[];
  language: string;
  storagePath?: string; // Path to the original file for text/epub/pdf OR temp zip path for audio
  chapters?: Chapter[]; // Array of chapter details for audiobooks
  summary?: string;
  readingProgress: number; // Percentage 0-100
  createdAt: number; // Timestamp
  audioGenerationStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  audioGenerationError?: string;
  
  // Client-side only fields
  status?: 'processing' | 'uploading' | 'ready';
  localFile?: File; // The actual file, stored locally
}

export interface PendingBook {
    id: string; // Use a client-generated UUID
    file: File;
    fileDataUrl: string; // Used for actual file upload
    type: 'epub' | 'pdf' | 'text' | 'audio';
    metadata: Partial<GenerateBookMetadataOutput> & { title: string }; // Title is mandatory
    coverPreviewUrl?: string; // Used for client-side preview (can be blob or data URL)
}

// Add uuid to the global scope for the new book page
declare global {
  interface Window {
    uuidv4: () => string;
  }
}

if (typeof window !== 'undefined') {
  window.uuidv4 = uuidv4;
}
