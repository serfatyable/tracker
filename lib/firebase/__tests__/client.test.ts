import { describe, expect, it, beforeEach, afterAll } from 'vitest';

import { getFirebaseStatus } from '../client';

const ENV_KEYS = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
] as const;

const originalEnv = new Map<string, string | undefined>();

for (const key of ENV_KEYS) {
  originalEnv.set(key, process.env[key]);
}

beforeEach(() => {
  for (const key of ENV_KEYS) {
    delete process.env[key];
  }
});

afterAll(() => {
  for (const key of ENV_KEYS) {
    const original = originalEnv.get(key);
    if (original === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = original;
    }
  }
});

describe('getFirebaseStatus', () => {
  it('reports missing env var names for projectId', () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'example.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

    const status = getFirebaseStatus();

    expect(status.ok).toBe(false);
    expect(status.missing).toContain('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  });

  it('returns ok when all required env vars are present', () => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'project-id';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'example.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';

    const status = getFirebaseStatus();
    expect(status.ok).toBe(true);
    expect(status.missing).toEqual([]);
  });
});
