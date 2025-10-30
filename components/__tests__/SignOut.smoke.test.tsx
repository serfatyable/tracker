import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import TopBar from '../TopBar';

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
  usePathname: () => '/',
}));

vi.mock('../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({ data: { uid: 'u1', fullName: 'Test User' } }),
}));

describe('TopBar smoke', () => {
  it('renders language toggle', () => {
    render(<TopBar />);
    // TopBar should render with language toggle
    expect(screen.getByRole('button', { name: /toggle language/i })).toBeInTheDocument();
  });
});
