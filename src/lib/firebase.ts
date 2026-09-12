import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import appletConfig from '../../firebase-applet-config.json';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ((process.env as any) || {});

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || 'demo-api-key',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || 'demo-project.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || 'demo-project',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || 'demo-project.appspot.com',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || '123456789',
  appId: env.VITE_FIREBASE_APP_ID || appletConfig.appId || '1:123456789:web:demo',
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const auth = getAuth(app);

// Use provisioned firestoreDatabaseId if configured
const databaseId = env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || undefined;
const db = initializeFirestore(app, {}, databaseId);

const storage = getStorage(app);

export { app, auth, db, storage };
