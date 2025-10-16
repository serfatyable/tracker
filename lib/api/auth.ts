/**
 * Server-side authentication utilities for API routes
 *
 * SECURITY NOTE: This module provides proper Firebase Auth verification
 * for API routes. Do NOT trust client-provided headers like 'x-user-uid'
 * without verification.
 */

import { getAuth } from 'firebase-admin/auth';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getAdminApp } from '../firebase/admin-sdk';

export type AuthResult = {
  uid: string;
  email?: string;
};

/**
 * Verify Firebase ID token from Authorization header
 * Returns user info if valid, or throws error
 */
export async function verifyAuthToken(req: NextRequest): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header');
  }

  const idToken = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    const decodedToken = await auth.verifyIdToken(idToken);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Verify user has admin role and is approved
 */
export async function requireAdminAuth(req: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuthToken(req);

  // Verify admin role by checking Firestore
  const app = getAdminApp();
  const auth = getAuth(app);
  const _userRecord = await auth.getUser(authResult.uid);

  // Check custom claims or Firestore for role
  // For now, we'll check Firestore directly
  const { getFirestore } = await import('firebase-admin/firestore');
  const db = getFirestore(app);
  const userDoc = await db.collection('users').doc(authResult.uid).get();

  if (!userDoc.exists) {
    throw new Error('User profile not found');
  }

  const userData = userDoc.data();

  if (userData?.role !== 'admin' || userData?.status !== 'active') {
    throw new Error('Forbidden: Admin access required');
  }

  return authResult;
}

/**
 * Verify user has tutor or admin role and is approved
 */
export async function requireTutorOrAdminAuth(req: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuthToken(req);

  const { getFirestore } = await import('firebase-admin/firestore');
  const app = getAdminApp();
  const db = getFirestore(app);
  const userDoc = await db.collection('users').doc(authResult.uid).get();

  if (!userDoc.exists) {
    throw new Error('User profile not found');
  }

  const userData = userDoc.data();
  const role = userData?.role;
  const status = userData?.status;

  if ((role !== 'admin' && role !== 'tutor') || status !== 'active') {
    throw new Error('Forbidden: Tutor or Admin access required');
  }

  return authResult;
}

/**
 * Create a standard error response for auth failures
 */
export function createAuthErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'Authentication failed';

  if (message.includes('Missing') || message.includes('Invalid')) {
    return NextResponse.json({ error: message }, { status: 401 });
  }

  if (message.includes('Forbidden')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }

  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}
