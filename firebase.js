import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

const serviceAccountPath = '/etc/secrets/firebase-service-account.json';

let app = null;
let db = null;
let serviceAccount = null;

if (!fs.existsSync(serviceAccountPath)) {
  console.error('Firebase service account file not found at', serviceAccountPath);
} else {
  try {
    const rawData = fs.readFileSync(serviceAccountPath, 'utf-8');
    serviceAccount = JSON.parse(rawData);
    console.log(`[Firebase Admin Startup] Loaded service account for project_id: ${serviceAccount?.project_id || serviceAccount?.projectId}`);

    if (admin.apps && admin.apps.length > 0) {
      app = admin.apps[0];
    } else {
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log(`Firebase Admin connected to Firestore successfully for project: ${serviceAccount?.project_id || serviceAccount?.projectId}`);
  } catch (error) {
    console.error('Firebase Admin initialization error from service account:', error);
  }
}

const adminDb = db;
const adminApp = app;

export { admin, app, db, adminDb, adminApp, serviceAccount, serviceAccountPath };
export default admin;

