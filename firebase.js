import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

let app = null;
let db = null;

try {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    const credentialsEnv = process.env.FIREBASE_CREDENTIALS;
    if (credentialsEnv && credentialsEnv.trim() !== '') {
      let credential;
      if (credentialsEnv.trim().startsWith('{')) {
        const serviceAccount = JSON.parse(credentialsEnv);
        credential = cert(serviceAccount);
      } else {
        credential = cert(credentialsEnv);
      }
      app = initializeApp({ credential });
      console.log('Firebase Admin initialized successfully via FIREBASE_CREDENTIALS.');
    } else {
      const projectId = process.env.FIREBASE_PROJECT_ID || 'ai-studio-mufasaapisecurit-e62cd757-2ccc-4f14-a207-84883da108c9';
      app = initializeApp({ projectId });
      console.log(`Firebase Admin initialized with Project ID: ${projectId}`);
    }
  }
  if (app) {
    db = getFirestore(app);
    db.settings({ ignoreUndefinedProperties: true });
  }
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
}

export { app, db };
