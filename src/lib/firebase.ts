import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, type AppCheck } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import appletConfig from '../../firebase-applet-config.json';

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ((process.env as any) || {});

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || appletConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID || appletConfig.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
  databaseURL: env.VITE_FIREBASE_DATABASE_URL,
};

const requiredFirebaseKeys = ['apiKey', 'authDomain', 'projectId', 'appId'] as const;
const missingFirebaseKeys = requiredFirebaseKeys.filter((key) => !firebaseConfig[key]);

if (missingFirebaseKeys.length > 0) {
  throw new Error(`Firebase yapılandırması eksik: ${missingFirebaseKeys.join(', ')}`);
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

const appCheckSiteKey = env.VITE_FIREBASE_APPCHECK_SITE_KEY || appletConfig.recaptchaSiteKey;
let appCheck: AppCheck | null = null;
if (typeof window !== 'undefined' && appCheckSiteKey) {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaEnterpriseProvider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    // Keep core authentication available, but protected production API calls
    // intentionally fail closed until App Check is configured.
    if (!String(error).includes('already been initialized')) {
      console.warn('Firebase App Check başlatılamadı; korumalı API özellikleri kullanılamaz.', error);
    }
  }
}

const auth = getAuth(app);

// Use provisioned firestoreDatabaseId if configured
export const databaseId = env.VITE_FIREBASE_DATABASE_ID || appletConfig.firestoreDatabaseId || undefined;
const db = initializeFirestore(app, {}, databaseId);

// Analytics is intentionally not initialized implicitly. A commercial rollout
// must first implement an explicit consent policy suitable for children's data.
export { app, appCheck, auth, db };
