import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { expect, afterEach, vi } from 'vitest';

expect.extend(matchers);

afterEach(() => {
	cleanup();
});

// Mock Next.js app router hooks for JSDOM environment
vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
	usePathname: () => '/',
}));

// Minimal i18n mock for react-i18next
vi.mock('react-i18next', async () => {
  const map: Record<string, string> = {
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.resetEmailSent': 'Reset email has been sent',
    'auth.submit': 'Submit',
    'auth.fullName': 'Full name',
    'auth.residencyStartDate': 'Residency start date',
  };
  return {
    useTranslation: () => ({ t: (k: string) => map[k] ?? k, i18n: { changeLanguage: vi.fn() } }),
    Trans: ({ children }: any) => children,
    initReactI18next: { type: '3rdParty', init: () => {} },
  } as any;
});

// Mock next/image to a plain img to reduce test overhead (no JSX to avoid transform issues)
vi.mock('next/image', () => ({
  default: (props: any) => {
    const React = require('react');
    const { src, alt, width, height, className } = props || {};
    return React.createElement('img', { src, alt, width, height, className });
  }
}));
