import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import AwaitingApprovalPage from '../page';

const replaceMock = vi.fn();
const useCurrentUserProfileMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('../../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => useCurrentUserProfileMock(),
}));

describe('AwaitingApprovalPage', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    useCurrentUserProfileMock.mockReset();
  });

  it('shows awaiting message while loading without redirecting', () => {
    useCurrentUserProfileMock.mockReturnValue({
      status: 'loading',
      firebaseUser: null,
      data: null,
      error: null,
      refetch: vi.fn(),
    });

    render(<AwaitingApprovalPage />);

    expect(screen.getByText(/awaiting approval/i)).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('redirects to auth when unauthenticated and ready', () => {
    useCurrentUserProfileMock.mockReturnValue({
      status: 'ready',
      firebaseUser: null,
      data: null,
      error: null,
      refetch: vi.fn(),
    });

    render(<AwaitingApprovalPage />);

    expect(replaceMock).toHaveBeenCalledWith('/auth');
  });

  it('redirects approved users to their role dashboard', () => {
    useCurrentUserProfileMock.mockReturnValue({
      status: 'ready',
      firebaseUser: { uid: 'user-1' },
      data: {
        uid: 'user-1',
        role: 'resident',
        status: 'active',
        settings: { language: 'en' },
        residencyStartDate: '2020-01-01',
        studyprogramtype: '6-year',
      },
      error: null,
      refetch: vi.fn(),
    });

    render(<AwaitingApprovalPage />);

    expect(replaceMock).toHaveBeenCalledWith('/resident');
  });
});
