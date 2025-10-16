/**
 * Client-side authenticated API call helpers
 *
 * Use these functions instead of raw fetch() to automatically
 * include Firebase authentication tokens in API requests.
 */

import { getAuth } from 'firebase/auth';

import { getFirebaseApp } from '../firebase/client';

/**
 * Make an authenticated fetch request with automatic Bearer token
 *
 * @example
 * const res = await fetchWithAuth('/api/morning-meetings/import', {
 *   method: 'POST',
 *   headers: { 'content-type': 'text/plain' },
 *   body: csvText,
 * });
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated. Please sign in.');
  }

  // Get fresh ID token
  const idToken = await user.getIdToken();

  // Add Authorization header
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${idToken}`);

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * Make an authenticated JSON POST request
 */
export async function postJSON<T = unknown>(
  url: string,
  data: unknown,
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetchWithAuth(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok) {
      return { ok: false, error: json.error || 'Request failed' };
    }

    return { ok: true, data: json as T };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Network error' };
  }
}
