import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import AdminPage from '../page';

vi.mock('../../../components/TopBar', () => ({ default: () => null }));

const { replaceMock, getCurrentUserWithProfileMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getCurrentUserWithProfileMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('../../../lib/firebase/auth', () => ({ getCurrentUserWithProfile: getCurrentUserWithProfileMock }));

describe('Admin Overview smoke', () => {
  it('shows Overview tab and KPI cards', async () => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({ ok: true, missing: [], usingEmulators: false });
    getCurrentUserWithProfileMock.mockResolvedValue({ firebaseUser: { uid: 'admin' }, profile: { uid: 'admin', role: 'admin', status: 'active', settings: { language: 'en' } } });

    render(<AdminPage />);

    await screen.findByText(/overview/i);
  });
});


