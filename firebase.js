import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app = null;
let db = null;

try {
  const credentialsEnv = process.env.FIREBASE_CREDENTIALS;
  if (credentialsEnv && credentialsEnv.trim() !== '') {
    if (getApps().length > 0) {
      app = getApp();
    } else {
      let credential;
      if (credentialsEnv.trim().startsWith('{')) {
        const serviceAccount = JSON.parse(credentialsEnv);
        credential = cert(serviceAccount);
      } else {
        credential = cert(credentialsEnv);
      }
      app = initializeApp({ credential });
      console.log('Firebase Admin initialized successfully via FIREBASE_CREDENTIALS.');
    }
    if (app) {
      db = getFirestore(app);
      db.settings({ ignoreUndefinedProperties: true });
    }
  } else {
    console.log('FIREBASE_CREDENTIALS not set; Firebase Admin SDK disabled in favor of Client Web SDK / local DB.');
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export { app, db };
