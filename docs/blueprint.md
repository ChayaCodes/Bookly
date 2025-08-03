# **App Name**: Bookly

## Core Features:

- Book Upload and Format Support: Intuitive UI for uploading books in PDF, EPUB, ZIP (containing MP3s), and ACSM formats.
- Personal Bookshelf Management: Organize books in a personal, taggable library with filtering, language support, and search functionalities.
- E-reader Display: Display uploaded ebooks for comfortable reading within the app.
- Text-to-Speech Conversion: Tool to convert any uploaded text into audio using Gemini TTS, including downloadable audio formats. Includes pre-processing to divide books into chapters and convert each chapter separately before compiling.
- Audiobook Player: Stream audiobooks, with a player UI that includes playback controls.
- Multi-Language Support: Multilingual UI support for global accessibility.
- Offline Functionality: Client-side operation: the app should function entirely within the browser for offline accessibility.
- Automated Book Importing: Monitor various sources (local folders, Telegram channels, etc.) to add books to the library without storing them locally until accessed.
- Standardized Book Format: All books are converted to a standard EPUB format upon upload, if necessary.
- Downloadable Books: Users can download books in various formats.
- Asynchronous Processing: Long running tasks, such as TTS conversion, are handled asynchronously in the background with progress indication, allowing users to continue using the app.
- Cross-Platform Support: The application is designed to be cross-platform, supporting web, mobile, and desktop environments.
- Theme Support: Support for both night and light modes.
- Sync Across Devices: Users may choose to sign in and sync their library, reading progress, and preferences across multiple devices using a secure cloud storage system.
- Reading Progress Tracking: Save and restore reading positions per book, support for bookmarks and optional highlighting for user notes.
- Accessibility Support: High-contrast mode, adjustable font sizes, keyboard navigation, and screen reader compatibility.
- Plugin Architecture: Easily extend core functionality (e.g., new file formats, external content sources, TTS engines) via plug-in modules and interface contracts.
- Privacy & Local Storage Transparency: Clear user controls for managing stored data, including manual file deletion, cache size management, and offline data transparency.
- Automatic Metadata Extraction: Automatic identification and extraction of metadata such as description, author name, cover image.
- Book Details Editing: A dialog for editing book details, allowing users to edit the book information.
- Book Conversion and Editing Tools: Users can upload a book in one format and download it in another, edit the book information, and use various tools.
- Ad Space: Displaying ads in the free version of the application.

## Style Guidelines:

- Soft sky-blue (#89B7E5) to invoke feelings of serenity, contemplation, and intellectual engagement.
- Very light blue (#F0F4F8), providing a calming backdrop that prevents eye strain during extended reading.
- A subdued purple (#9CA3DA), drawing users' attention subtly toward interactive elements and features
- Headline font: 'Playfair', a serif known for its modern elegance; body font: 'PT Sans' sans-serif font, complementing 'Playfair' by providing excellent readability for continuous reading
- Simple, line-based icons for navigation and controls, ensuring clarity and ease of use.
- Clean and minimalist layout to reduce distraction and improve reading focus.
- Subtle transitions for page turns and UI interactions to create a smooth and engaging experience.