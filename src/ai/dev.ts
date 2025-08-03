import { config } from 'dotenv';
config();

import '@/ai/flows/summarize-book-content.ts';
import '@/ai/flows/generate-book-metadata.ts';
import '@/ai/flows/generate-audiobook.ts';
import '@/ai/flows/generate-book-cover.ts';
