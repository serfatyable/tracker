import type { FirebaseApp } from 'firebase/app';
import { getApps, getApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { validateEnv } from '../config/validateEnv';
import { logger } from '../utils/logger';

type FirebasePublicConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  appId: string;
};

const firebaseEnvVarNames: { [K in keyof FirebasePublicConfig]: string } = {
  apiKey: 'NEXT_PUBLIC_FIREBASE_API_KEY',
  authDomain: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  projectId: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  storageBucket: 'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  appId: 'NEXT_PUBLIC_FIREBASE_APP_ID',
};

export type FirebaseStatus = {
  ok: boolean;
  missing: string[];
  usingEmulators: boolean;
};

export function getFirebaseStatus(): FirebaseStatus {
  const env: { [K in keyof FirebasePublicConfig]: string | undefined } = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = (Object.entries(env) as [keyof FirebasePublicConfig, string | undefined][])
    .filter(([, value]) => !value)
    .map(([key]) => firebaseEnvVarNames[key]);

  return {
    ok: missing.length === 0,
    missing,
    usingEmulators: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true',
  };
}

export function isFirebaseConfigured(): boolean {
  return getFirebaseStatus().ok;
}

function getValidatedConfig(): FirebasePublicConfig {
  const env = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  } as Record<string, string | undefined>;

  const missingKeys = (Object.entries(env) as [keyof FirebasePublicConfig, string | undefined][])
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    const missingEnvVars = missingKeys.map((key) => firebaseEnvVarNames[key]);
    const missingList = missingEnvVars.join(', ');
    // Keep throwing here to prevent initializing Firebase with a bad config.
    // Callers should gate on getFirebaseStatus() before calling getFirebaseApp().
    throw new Error(
      `Missing Firebase env vars: ${missingList}. Ensure .env.local matches .env.example or set Vercel Environment Variables.`,
    );
  }

  return env as FirebasePublicConfig;
}

export function getFirebaseApp(): FirebaseApp {
  // Validate all environment variables at startup
  // This ensures we fail fast with clear error messages if misconfigured
  validateEnv();

  if (!getApps().length) {
    const app = initializeApp(getValidatedConfig());
    if (process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
      const auth = getAuth(app);
      const db = getFirestore(app);
      try {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
      } catch (err) {
        logger.warn('Skipping emulator connection (already connected)', 'FirebaseClient', err);
      }
    }
    return app;
  }
  return getApp();
}
