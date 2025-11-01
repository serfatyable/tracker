import { describe, expect, it, beforeEach, afterEach, afterAll, vi } from 'vitest';

const { validateEnvMock } = vi.hoisted(() => ({
  validateEnvMock: vi.fn(),
}));

vi.mock('@lib/config/validateEnv', () => ({
  validateEnv: validateEnvMock,
}));

const firebaseAppMocks = vi.hoisted(() => ({
  initializeApp: vi.fn(() => ({ name: 'app' })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: 'existing-app' })),
}));

vi.mock('firebase/app', () => ({
  getApps: firebaseAppMocks.getApps,
  getApp: firebaseAppMocks.getApp,
  initializeApp: firebaseAppMocks.initializeApp,
}));

const firebaseAuthMocks = vi.hoisted(() => ({
  connectAuthEmulator: vi.fn(),
  getAuth: vi.fn(() => ({ name: 'auth' })),
}));

vi.mock('firebase/auth', () => ({
  connectAuthEmulator: firebaseAuthMocks.connectAuthEmulator,
  getAuth: firebaseAuthMocks.getAuth,
}));

const firebaseFirestoreMocks = vi.hoisted(() => ({
  connectFirestoreEmulator: vi.fn(),
  getFirestore: vi.fn(() => ({ name: 'db' })),
}));

vi.mock('firebase/firestore', () => ({
  connectFirestoreEmulator: firebaseFirestoreMocks.connectFirestoreEmulator,
  getFirestore: firebaseFirestoreMocks.getFirestore,
}));

import { getFirebaseApp, getFirebaseStatus } from '../client';

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

afterEach(() => {
  vi.clearAllMocks();
  delete (globalThis as { window?: unknown }).window;
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

describe('getFirebaseApp', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'example.firebaseapp.com';
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'project-id';
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'example.appspot.com';
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID = 'test-app-id';
  });

  it('validates env on the server', () => {
    delete (globalThis as { window?: unknown }).window;

    getFirebaseApp();

    expect(validateEnvMock).toHaveBeenCalledTimes(1);
    expect(firebaseAppMocks.initializeApp).toHaveBeenCalledTimes(1);
  });

  it('skips validateEnv in the browser', () => {
    (globalThis as { window?: unknown }).window = {};

    getFirebaseApp();

    expect(validateEnvMock).not.toHaveBeenCalled();
    expect(firebaseAppMocks.initializeApp).toHaveBeenCalledTimes(1);
  });
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
