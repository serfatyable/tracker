import { initializeApp, getApps, cert } from 'firebase-admin/app';

/**
 * Initialize Firebase Admin SDK only when needed
 * This prevents build-time errors when environment variables are not set
 */
export function initializeFirebaseAdmin() {
  if (!getApps().length) {
    // Check if we have the required environment variables
    if (
      !process.env.FIREBASE_PROJECT_ID ||
      !process.env.FIREBASE_CLIENT_EMAIL ||
      !process.env.FIREBASE_PRIVATE_KEY
    ) {
      throw new Error(
        'Firebase Admin SDK credentials not configured. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.',
      );
    }

    try {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
      });
    } catch (error) {
      console.error('Firebase admin initialization error:', error);
      throw error;
    }
  }
}
