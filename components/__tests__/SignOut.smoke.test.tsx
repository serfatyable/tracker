import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import TopBar from '../TopBar';

const { replaceMock, signOutMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  signOutMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('../../lib/firebase/auth', () => ({
  signOut: signOutMock,
}));

describe('Sign out smoke', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    signOutMock.mockClear();
  });

  it('signs out and navigates to /auth', async () => {
    const user = userEvent.setup();
    render(<TopBar />);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith('/auth');
  });
});
