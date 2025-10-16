import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import AuthPage from '../page';

const { getFirebaseStatusMock } = vi.hoisted(() => ({
  getFirebaseStatusMock: vi.fn().mockReturnValue({ ok: true, missing: [], usingEmulators: false }),
}));

vi.mock('../../../lib/firebase/client', () => ({
  getFirebaseStatus: () => getFirebaseStatusMock(),
}));

const {
  pushMock,
  signInMock,
  signUpMock,
  requestPasswordResetMock,
  getCurrentUserWithProfileMock,
} = vi.hoisted(() => ({
  pushMock: vi.fn(),
  signInMock: vi.fn().mockResolvedValue({ uid: 'test-user-signin' }),
  signUpMock: vi.fn().mockResolvedValue({ uid: 'test-user-signup' }),
  requestPasswordResetMock: vi.fn().mockResolvedValue(undefined),
  getCurrentUserWithProfileMock: vi.fn().mockResolvedValue({
    firebaseUser: { uid: 'test-user-signin' },
    profile: { settings: { language: 'en' } },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('../../../lib/firebase/auth', () => ({
  signIn: signInMock,
  signUp: signUpMock,
  getCurrentUserWithProfile: getCurrentUserWithProfileMock,
  requestPasswordReset: requestPasswordResetMock,
}));

function formatYYYYMMDD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

describe('AuthPage smoke', () => {
  beforeEach(() => {
    pushMock.mockClear();
    signInMock.mockClear();
    signUpMock.mockClear();
    getCurrentUserWithProfileMock.mockClear();
    // Ensure default language is consistent
    window.localStorage.removeItem('i18n_lang');
  });

  it('allows sign-up and navigates to awaiting-approval', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Switch to Sign up tab
    await user.click(screen.getByRole('tab', { name: /sign up/i }));

    // Fill sign-up form fields
    await user.type(screen.getByLabelText(/full name/i), 'Test User');
    await user.type(screen.getByLabelText(/email/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');

    // Residency date: use yesterday to avoid future-date validation
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = formatYYYYMMDD(yesterday);
    await user.type(screen.getByLabelText(/residency start date/i), dateStr);

    // Submit
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Expect signUp called and navigation to awaiting-approval
    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/awaiting-approval');
    });
  });

  it('allows sign-in and navigates to awaiting-approval', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Switch to Sign in tab (it is selected by default, but this is explicit)
    await user.click(screen.getByRole('tab', { name: /sign in/i }));

    // Fill sign-in form fields
    await user.type(screen.getByLabelText(/email/i), 'user@example.com');
    await user.type(screen.getByLabelText(/^password$/i), 'password123');

    // Submit (button in sign-in panel is labeled "Sign in")
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // Expect signIn called, profile fetched, and navigation
    await waitFor(() => {
      expect(signInMock).toHaveBeenCalledTimes(1);
      expect(getCurrentUserWithProfileMock).toHaveBeenCalledTimes(1);
      expect(pushMock).toHaveBeenCalledWith('/awaiting-approval');
    });
  });

  it('sends forgot password email and shows confirmation', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Enter email either in reset email field or reuse sign-in email
    await user.type(screen.getByLabelText(/^Email$/i), 'user@example.com');

    // Click Forgot password?
    await user.click(screen.getByRole('button', { name: /forgot password\?/i }));

    await waitFor(() => {
      expect(requestPasswordResetMock).toHaveBeenCalledWith('user@example.com');
      expect(screen.getByRole('status')).toHaveTextContent(/reset email has been sent/i);
    });
  });
});
