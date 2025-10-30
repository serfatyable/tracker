import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import * as clientMod from '../../lib/firebase/client';
import OnCallPage from '../on-call/page';

vi.mock('../../components/TopBar', () => ({ default: () => null }));
vi.mock('../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({ data: { uid: 'u1' } }),
}));
vi.mock('../../lib/hooks/useOnCallToday', () => ({
  useOnCallToday: () => ({ loading: false, data: { stations: {}, dateKey: '2025-11-01' } }),
}));
vi.mock('../../lib/hooks/useOnCallUpcomingByUser', () => ({
  useOnCallUpcomingByUser: () => ({ loading: false, next: null }),
}));
vi.mock('../../lib/hooks/useOnCallByDate', () => ({
  useOnCallByDate: () => ({ loading: false, data: { stations: {}, dateKey: '2025-11-01' } }),
}));

describe('OnCallPage smoke', () => {
  it('renders tab navigation', () => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    });
    render(<OnCallPage />);
    // Assert tab buttons are present
    expect(screen.getByRole('button', { name: /my/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /today/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument();
  });
});
