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

vi.mock('../../../lib/hooks/useRotations', () => ({
  useRotations: () => ({
    rotations: [
      { id: 'rotation-1', name: 'Rotation One', name_en: 'Rotation One', name_he: 'סבב אחד' },
      { id: 'rotation-2', name: 'Rotation Two', name_en: 'Rotation Two', name_he: 'סבב שתיים' },
    ],
    loading: false,
    error: null,
  }),
}));

describe('AuthPage smoke', () => {
  beforeEach(() => {
    pushMock.mockClear();
    signInMock.mockClear();
    signUpMock.mockClear();
    getCurrentUserWithProfileMock.mockClear();
    // Ensure default language is consistent
    window.localStorage.removeItem('i18n_lang');
  });

  it('renders sign-up form with all fields', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Switch to Sign up tab
    await user.click(screen.getByRole('tab', { name: /sign up/i }));

    // Verify all required sign-up form fields are present
    const fullNameInputs = screen.getAllByLabelText(/full name/i);
    expect(fullNameInputs.length).toBeGreaterThan(0);

    const emailInputs = screen.getAllByLabelText(/email/i);
    expect(emailInputs.length).toBeGreaterThan(0);

    const passwordInputs = screen.getAllByLabelText(/^password$/i);
    expect(passwordInputs.length).toBeGreaterThan(0);

    // Residency date field should be visible for resident role (default)
    expect(screen.getByLabelText(/residency start date/i)).toBeInTheDocument();

    // Sign-up button should be present
    expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
  });

  it('allows sign-in and navigates to awaiting-approval', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    // Switch to Sign in tab (it is selected by default, but this is explicit)
    await user.click(screen.getByRole('tab', { name: /sign in/i }));

    // Fill sign-in form fields (multiple labels exist due to tabs, get all and use first for sign-in)
    const emailInputs = screen.getAllByLabelText(/email/i);
    await user.type(emailInputs[0]!, 'user@example.com');

    const passwordInputs = screen.getAllByLabelText(/^password$/i);
    await user.type(passwordInputs[0]!, 'password123');

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

  it('submits sign-up form for tutor role', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.click(screen.getByRole('tab', { name: /sign up/i }));

    await user.type(screen.getByLabelText(/^Full name$/i), 'Tutor Test');
    await user.type(screen.getByLabelText(/^Email$/i), 'tutor@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'password123');

    await user.click(screen.getByRole('button', { name: /Tutor/i }));

    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith(
        expect.objectContaining({
          fullName: 'Tutor Test',
          email: 'tutor@example.com',
          role: 'tutor',
        }),
      );
      expect(pushMock).toHaveBeenCalledWith('/awaiting-approval');
    });
  });

  it('requires rotation selection for resident sign-up', async () => {
    const user = userEvent.setup();
    render(<AuthPage />);

    await user.click(screen.getByRole('tab', { name: /sign up/i }));

    await user.type(screen.getByLabelText(/^Full name$/i), 'Resident Test');
    await user.type(screen.getByLabelText(/^Email$/i), 'resident@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'password123');
    await user.type(screen.getByLabelText(/residency start date/i), '2020-01-01');
    await user.selectOptions(screen.getByLabelText(/study program/i), '4-year');

    // Attempt submit without choosing current rotation
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    expect(signUpMock).not.toHaveBeenCalled();
    expect(screen.getByText(/rotation required/i)).toBeInTheDocument();

    // Select current rotation and retry
    const rotationSelect = screen.getAllByRole('combobox')[1]!;
    await user.selectOptions(rotationSelect, 'rotation-1');
    await user.click(screen.getByRole('button', { name: /sign up/i }));

    await waitFor(() => {
      expect(signUpMock).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'resident', currentRotationId: 'rotation-1' }),
      );
    });
  });
});
