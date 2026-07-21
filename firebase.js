import admin from 'firebase-admin';

let app = null;
let db = null;

try {
  const credentialsEnv = process.env.FIREBASE_CREDENTIALS;
  if (credentialsEnv && credentialsEnv.trim() !== '') {
    let credential;
    if (credentialsEnv.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(credentialsEnv);
      credential = admin.credential.cert(serviceAccount);
    } else {
      credential = admin.credential.cert(credentialsEnv);
    }
    app = admin.initializeApp({
      credential: credential
    });
    console.log('Firebase Admin initialized successfully via FIREBASE_CREDENTIALS.');
  } else {
    // Fallback to default credentials or default initialization
    app = admin.initializeApp();
    console.log('Firebase Admin initialized successfully using Application Default Credentials.');
  }
  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  
  // Try initializing with Project ID as fallback for local/preview development without environment credentials
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || 'ai-studio-mufasaapisecurit-e62cd757-2ccc-4f14-a207-84883da108c9';
    app = admin.initializeApp({
      projectId: projectId
    });
    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log(`Firebase Admin initialized with Project ID fallback: ${projectId}`);
  } catch (err2) {
    console.error('Secondary Firebase Admin initialization failed:', err2);
  }
}

export { admin, db };
