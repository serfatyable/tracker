import * as matchers from '@testing-library/jest-dom/matchers';
import { cleanup } from '@testing-library/react';
import { expect, afterEach, vi } from 'vitest';

expect.extend(matchers);

afterEach(() => {
  cleanup();
});

// Provide minimal Firebase public env vars for tests
process.env.NEXT_PUBLIC_FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'test-key';
process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN =
  process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'localhost';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID =
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'tracker-test';
process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'tracker-test';
process.env.NEXT_PUBLIC_FIREBASE_APP_ID = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'test-app';
process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS || 'true';

// Mock Next.js app router hooks for JSDOM environment
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

// Minimal i18n mock for react-i18next: map common keys, otherwise humanize the last segment
vi.mock('react-i18next', async () => {
  const map: Record<string, string> = {
    // auth
    'auth.signIn': 'Sign in',
    'auth.signUp': 'Sign up',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.forgotPassword': 'Forgot password?',
    'auth.resetEmailSent': 'Reset email has been sent',
    'auth.submit': 'Submit',
    'auth.fullName': 'Full name',
    'auth.residencyStartDate': 'Residency start date',
    // ui basic
    'ui.dashboard': 'Dashboard',
    'ui.overview': 'Overview',
    'ui.settings': 'Settings',
    'ui.tasks': 'Tasks',
    'ui.users': 'Users',
    'ui.rotations': 'Rotations',
    'ui.reflections': 'Reflections',
    'ui.open': 'Open',
    'ui.status': 'Status',
    'ui.all': 'All',
    'ui.pending': 'Pending',
    'ui.approved': 'Approved',
    'ui.awaitingApproval': 'Awaiting approval',
    'ui.required': 'Required',
    'ui.active': 'Active',
    'ui.complete': 'complete',
    'ui.noItems': 'No items',
    'ui.recentLogs': 'Recent logs',
    'ui.noRecentLogs': 'No recent logs',
    'ui.announcements': 'Announcements',
    'ui.none': 'None',
    'ui.searchRotations': 'Search rotations',
    'ui.searchRotationsOrItems': 'Search rotations or items...',
    'ui.goToActiveRotation': 'Go to active rotation',
    'ui.logActivity': 'Log activity',
    'ui.category.knowledge': 'knowledge',
    'ui.category.skills': 'skills',
    'ui.category.guidance': 'guidance',
    // overview
    'overview.type': 'Type',
    'overview.type.activate': 'Activate',
    'overview.type.finish': 'Finish',
    'overview.status.pending': 'Pending',
    'overview.status.approved': 'Approved',
    'overview.status.denied': 'Denied',
    'overview.actions.approve': 'Approve',
    'overview.actions.deny': 'Deny',
    // tutor tabs
    'tutor.tabs.residents': 'Residents',
    'tutor.tabs.tasks': 'Tasks',
    'tutor.tabs.rotations': 'Rotations',
    // resident sections
    'resident.progress': 'Progress',
    'resident.approvals': 'Approvals',
    'resident.resources': 'Resources',
    // tabs
    // (duplicates removed)
  };

// Simple microtask/timeout flusher to let pending effects settle in tests
async function flushAllPromises() {
  await new Promise((r) => setTimeout(r, 0));
}
(globalThis as any).flushAllPromises = flushAllPromises;
  const humanize = (k: string) => {
    const seg = k.split('.').pop() || k;
    return seg.replace(/[_.-]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  };
  return {
    useTranslation: () => ({ t: (k: string) => map[k] ?? humanize(k), i18n: { changeLanguage: vi.fn() } }),
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
  },
}));
