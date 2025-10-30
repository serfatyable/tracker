import { render } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Ensure router is mocked
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import AuthPage from '../page';

describe('AuthPage env handling', () => {
  const original = { ...process.env };
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...original };
  });

  it('shows env warning when Firebase is not configured', () => {
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
    const { getAllByText } = render((<AuthPage />) as any);
    // i18n mock humanizes the key to lowercase with spaces (multiple instances exist)
    const warnings = getAllByText(/firebase not configured/i);
    expect(warnings.length).toBeGreaterThan(0);
  });
});
