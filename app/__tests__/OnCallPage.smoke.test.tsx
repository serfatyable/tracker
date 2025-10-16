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
  it('renders headings', () => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    });
    render(<OnCallPage />);
    // Assert present headings in current UI
    expect(screen.getByText(/title/i)).toBeInTheDocument();
    expect(screen.getByText(/today/i)).toBeInTheDocument();
    expect(screen.getByText(/timeline/i)).toBeInTheDocument();
  });
});
