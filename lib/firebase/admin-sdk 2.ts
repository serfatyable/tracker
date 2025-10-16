/**
 * Firebase Admin SDK initialization
 * This should only be used server-side in API routes
 */

import type { App } from 'firebase-admin/app';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

let adminApp: App | null = null;

export function getAdminApp(): App {
  if (adminApp) {
    return adminApp;
  }

  const apps = getApps();
  if (apps.length > 0) {
    adminApp = apps[0]!;
    return adminApp;
  }

  // Initialize with service account credentials
  // IMPORTANT: These should be set as environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // The private key needs to handle escaped newlines
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      'Missing Firebase Admin SDK credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.',
    );
  }

  adminApp = initializeApp({
    credential: cert(serviceAccount),
  });

  return adminApp;
}
