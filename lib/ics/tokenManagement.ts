/**
 * ICS Token Management Utilities
 *
 * Server-side utilities for managing calendar subscription tokens in Firestore.
 * These should be used when users need to generate/regenerate their calendar tokens.
 */

import { doc, getDoc, updateDoc, getFirestore } from 'firebase/firestore';

import { getFirebaseApp } from '../firebase/client';

import { generateCalendarToken } from './tokens';

/**
 * Generate and store a new ICS token for a user
 * This should be called when a user needs a new calendar subscription URL
 *
 * @param userId - User ID to generate token for
 * @returns The newly generated token
 *
 * @example
 * ```typescript
 * const token = await generateUserIcsToken(user.uid);
 * const calendarUrl = `https://tracker.app/api/ics/exams/${token}`;
 * ```
 */
export async function generateUserIcsToken(userId: string): Promise<string> {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const userRef = doc(db, 'users', userId);

  // Generate new token
  const token = generateCalendarToken();

  // Store in user settings
  await updateDoc(userRef, {
    'settings.icsToken': token,
    'settings.icsTokenGeneratedAt': new Date(),
  });

  return token;
}

/**
 * Get user's current ICS token (or generate one if they don't have one)
 *
 * @param userId - User ID
 * @returns The user's ICS token
 *
 * @example
 * ```typescript
 * const token = await getUserIcsToken(user.uid);
 * if (!token) {
 *   // User doesn't have a token yet, generate one
 *   const newToken = await generateUserIcsToken(user.uid);
 * }
 * ```
 */
export async function getUserIcsToken(userId: string): Promise<string | null> {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    throw new Error('User not found');
  }

  const userData = userSnap.data();
  return userData?.settings?.icsToken || null;
}

/**
 * Revoke (delete) a user's ICS token
 * This should be called when a user wants to disable calendar subscriptions
 * or if their token was compromised
 *
 * @param userId - User ID
 *
 * @example
 * ```typescript
 * await revokeUserIcsToken(user.uid);
 * // All calendar subscriptions using old token will now fail
 * ```
 */
export async function revokeUserIcsToken(userId: string): Promise<void> {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const userRef = doc(db, 'users', userId);

  // Remove token from user settings
  await updateDoc(userRef, {
    'settings.icsToken': null,
    'settings.icsTokenRevokedAt': new Date(),
  });
}

/**
 * Calendar subscription URL builders
 * These helpers construct the correct URLs for calendar subscriptions
 */
export function buildExamsCalendarUrl(token: string, lang: 'en' | 'he' = 'en'): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/ics/exams/${token}?lang=${lang}&upcoming=true`;
}

export function buildOnCallCalendarUrl(token: string, personal: boolean = true): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/ics/on-call/${token}?personal=${personal}`;
}

export function buildMorningMeetingsCalendarUrl(token: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/api/ics/morning-meetings/${token}`;
}

/**
 * Security considerations for token management:
 *
 * 1. Token Generation:
 *    - Only authenticated users can generate tokens
 *    - Tokens are user-specific and stored in their profile
 *
 * 2. Token Revocation:
 *    - Users can revoke tokens at any time
 *    - Revoked tokens immediately stop working
 *    - Users can generate new tokens after revocation
 *
 * 3. Token Rotation:
 *    - Recommended: Rotate tokens every 90 days (future enhancement)
 *    - Can be automated or user-initiated
 *
 * 4. Token Compromise:
 *    - If token is leaked/compromised, user can revoke and regenerate
 *    - Rate limiting prevents abuse even with valid token
 *    - Each token only grants access to one user's data
 *
 * 5. Monitoring:
 *    - Track token usage via rate limiting analytics
 *    - Alert on suspicious patterns (e.g., many requests from different IPs)
 */
