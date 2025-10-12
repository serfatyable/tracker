import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import AdminPage from '../page';

vi.mock('../../../components/TopBar', () => ({ default: () => null }));

const {
  replaceMock,
  getCurrentUserWithProfileMock,
  listUsersMock,
  listTasksMock,
  listRotationsMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getCurrentUserWithProfileMock: vi.fn(),
  listUsersMock: vi.fn(),
  listTasksMock: vi.fn(),
  listRotationsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('../../../lib/firebase/auth', () => ({
  getCurrentUserWithProfile: getCurrentUserWithProfileMock,
}));
vi.mock('../../../lib/firebase/admin', async () => {
  const actual = await vi.importActual<any>('../../../lib/firebase/admin');
  return {
    ...actual,
    listUsers: listUsersMock,
    listTasks: listTasksMock,
    listRotations: listRotationsMock,
  };
});

describe('Admin Rotations smoke', () => {
  it('shows rotations tab and lists rotations', async () => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    });
    getCurrentUserWithProfileMock.mockResolvedValue({
      firebaseUser: { uid: 'admin' },
      profile: { uid: 'admin', role: 'admin', status: 'active', settings: { language: 'en' } },
    });
    listUsersMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listTasksMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listRotationsMock.mockResolvedValue({
      items: [
        {
          id: 'r1',
          name: 'ICU',
          startDate: { toDate: () => new Date('2025-01-01') },
          endDate: { toDate: () => new Date('2025-06-01') },
          status: 'active',
        },
      ],
      lastCursor: undefined,
    });

    const user = userEvent.setup();
    render(<AdminPage />);

    await user.click(screen.getByRole('button', { name: /rotations/i }));
    const icu = await screen.findByText('ICU');
    const card = icu.closest('div')!;
    expect(card).toBeTruthy();
    // Presence of the ICU card is enough; status text may be localized/cased
    // so we avoid asserting on it here.
  });
});
