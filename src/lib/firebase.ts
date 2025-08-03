import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore, memoryLocalCache } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { firebaseConfig } from "./firebase-config";

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Using initializeFirestore allows for more configuration than getFirestore
const db = initializeFirestore(app, {
  // Using memoryLocalCache to avoid the "Failed to get document from cache"
  // error that can happen in some development environments with hot-reloading.
  // For production, you might consider using persistentLocalCache for full offline support.
  localCache: memoryLocalCache(),
});

const storage = getStorage(app);

export { db, storage };
