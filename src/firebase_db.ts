/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore,
  Firestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  writeBatch,
  getDoc,
  setLogLevel,
  deleteDoc
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
}

let firebaseApp: FirebaseApp | null = null;
let db: Firestore | null = null;
let webDbDisabled = false;

function isPermissionError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  return (
    err.code === 7 ||
    err.code === 'permission-denied' ||
    msg.includes('permission') ||
    msg.includes('permission_denied')
  );
}

// Load config from file or environment variables
function getFirebaseConfig(): FirebaseConfig | null {
  // 1. Try to read from firebase-applet-config.json
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const data = JSON.parse(raw);
      if (
        data.apiKey && 
        data.projectId && 
        data.projectId.trim() !== '' && 
        data.apiKey.trim() !== '' &&
        !data.projectId.includes('YOUR_PROJECT_ID') && 
        !data.apiKey.includes('YOUR_API_KEY')
      ) {
        return {
          apiKey: data.apiKey,
          authDomain: data.authDomain,
          projectId: data.projectId,
          storageBucket: data.storageBucket,
          messagingSenderId: data.messagingSenderId,
          appId: data.appId,
          firestoreDatabaseId: data.firestoreDatabaseId
        };
      }
    } catch (err) {
      console.error('Error reading firebase-applet-config.json:', err);
    }
  }

  // 2. Try to read from environment variables
  const apiKey = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  if (
    apiKey && 
    projectId && 
    apiKey.trim() !== '' && 
    projectId.trim() !== '' && 
    !apiKey.includes('YOUR_API_KEY') && 
    !projectId.includes('YOUR_PROJECT_ID')
  ) {
    return {
      apiKey: apiKey,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || `${projectId}.firebaseapp.com`,
      projectId: projectId,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || '',
      firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID
    };
  }

  return null;
}

export function initFirebase(): boolean {
  if (db) return true;

  const config = getFirebaseConfig();
  if (!config) {
    console.warn('Firebase configuration not found. Falling back to local JSON database.');
    return false;
  }

  try {
    // Suppress benign internal warnings/info logs from the gRPC connection pool
    setLogLevel('error');

    if (getApps().length === 0) {
      firebaseApp = initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId
      });
    } else {
      firebaseApp = getApps()[0];
    }

    // Initialize Firestore with custom databaseId if provided
    db = config.firestoreDatabaseId 
      ? getFirestore(firebaseApp, config.firestoreDatabaseId)
      : getFirestore(firebaseApp);

    console.log(`Firebase Firestore initialized successfully. Project: ${config.projectId}, Database ID: ${config.firestoreDatabaseId || '(default)'}`);
    return true;
  } catch (err) {
    console.error('Error initializing Firebase:', err);
    return false;
  }
}

export function isFirebaseEnabled(): boolean {
  return db !== null && !webDbDisabled;
}

export function isFirebaseWebDisabled(): boolean {
  return webDbDisabled;
}

export function disableFirebaseWeb(reason?: string): void {
  if (!webDbDisabled) {
    webDbDisabled = true;
    console.warn(`[Firestore Web SDK] Permissions unavailable (${reason || 'permission-denied'}). Seamlessly switching to local database storage.`);
  }
}

/**
 * Fetch all documents from a Firestore collection
 */
export async function getCollectionData<T>(collectionName: string): Promise<T[]> {
  if (!db || webDbDisabled) {
    return [];
  }

  try {
    const colRef = collection(db, collectionName);
    const querySnapshot = await getDocs(colRef);
    const items: T[] = [];
    querySnapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as T);
    });
    return items;
  } catch (err: any) {
    if (isPermissionError(err)) {
      disableFirebaseWeb(err?.message || 'insufficient permissions');
      return [];
    }
    console.warn(`Firestore getCollectionData (${collectionName}):`, err?.message || err);
    throw err;
  }
}

/**
 * Fetch a single document from a collection
 */
export async function getDocumentData<T>(collectionName: string, docId: string): Promise<T | null> {
  if (!db || webDbDisabled) {
    return null;
  }

  try {
    const docRef = doc(db, collectionName, docId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  } catch (err: any) {
    if (isPermissionError(err)) {
      disableFirebaseWeb(err?.message || 'insufficient permissions');
      return null;
    }
    console.warn(`Firestore getDocumentData (${collectionName}/${docId}):`, err?.message || err);
    throw err;
  }
}

/**
 * Save a single document to Firestore
 */
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  if (!db || webDbDisabled) {
    return;
  }

  try {
    // Exclude 'id' property from document body if it exists to avoid redundancy
    const { id, ...docData } = data;
    const docRef = doc(db, collectionName, docId);
    await setDoc(docRef, docData, { merge: true });
  } catch (err: any) {
    if (isPermissionError(err)) {
      disableFirebaseWeb(err?.message || 'insufficient permissions');
      return;
    }
    console.warn(`Firestore saveDocument (${collectionName}/${docId}):`, err?.message || err);
    throw err;
  }
}

/**
 * Synchronize a full collection to Firestore using Batch Writes
 */
export async function syncCollection<T extends { id: string }>(collectionName: string, items: T[]): Promise<void> {
  if (!db || webDbDisabled) {
    return;
  }

  if (items.length === 0) return;

  try {
    // Firestore batches are limited to 500 operations
    const BATCH_LIMIT = 400;
    for (let i = 0; i < items.length; i += BATCH_LIMIT) {
      const chunk = items.slice(i, i + BATCH_LIMIT);
      const batch = writeBatch(db);

      chunk.forEach((item) => {
        const { id, ...docData } = item;
        const docRef = doc(db!, collectionName, id);
        batch.set(docRef, docData, { merge: true });
      });

      await batch.commit();
    }
  } catch (err: any) {
    if (isPermissionError(err)) {
      disableFirebaseWeb(err?.message || 'insufficient permissions');
      return;
    }
    console.warn(`Firestore syncCollection (${collectionName}):`, err?.message || err);
    throw err;
  }
}

/**
 * Delete a document from a Firestore collection
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  if (!db || webDbDisabled) {
    return;
  }

  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (isPermissionError(err)) {
      disableFirebaseWeb(err?.message || 'insufficient permissions');
      return;
    }
    console.warn(`Firestore deleteDocument (${collectionName}/${docId}):`, err?.message || err);
    throw err;
  }
}
