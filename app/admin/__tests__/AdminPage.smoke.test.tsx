import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
// Import AdminPage dynamically after mocks are in place
let AdminPage: any;

// Stub TopBar to minimize noise
vi.mock('../../../components/TopBar', () => ({ default: () => null }));

// Hoisted mocks
const {
  replaceMock,
  getCurrentUserWithProfileMock,
  listUsersMock,
  listTasksMock,
  listRotationsMock,
  listRotationPetitionsMock,
  ensureCoreRotationsSeededMock,
  updateUsersStatusMock,
  updateUsersRoleMock,
  updateTasksStatusMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getCurrentUserWithProfileMock: vi.fn(),
  listUsersMock: vi.fn(),
  listTasksMock: vi.fn(),
  listRotationsMock: vi.fn(),
  listRotationPetitionsMock: vi.fn(),
  ensureCoreRotationsSeededMock: vi.fn(),
  updateUsersStatusMock: vi.fn(),
  updateUsersRoleMock: vi.fn(),
  updateTasksStatusMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

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
    listRotationPetitions: listRotationPetitionsMock,
    ensureCoreRotationsSeeded: ensureCoreRotationsSeededMock,
    updateUsersStatus: updateUsersStatusMock,
    updateUsersRole: updateUsersRoleMock,
    updateTasksStatus: updateTasksStatusMock,
  };
});

describe('AdminPage smoke', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    getCurrentUserWithProfileMock.mockReset();
    listUsersMock.mockReset();
    listTasksMock.mockReset();
    listRotationsMock.mockReset();
    listRotationPetitionsMock.mockReset();
    ensureCoreRotationsSeededMock.mockReset();
    updateUsersStatusMock.mockReset();
    updateUsersRoleMock.mockReset();
    updateTasksStatusMock.mockReset();

    // Provide safe defaults for tests that don't exercise these flows
    listRotationsMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listRotationPetitionsMock.mockResolvedValue({ items: [], lastCursor: undefined });
    ensureCoreRotationsSeededMock.mockResolvedValue(undefined);
  });

  it('redirects non-admin users', async () => {
    if (!AdminPage) {
      AdminPage = (await import('../page')).default;
    }
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    });
    getCurrentUserWithProfileMock.mockResolvedValue({
      firebaseUser: { uid: 'u1' },
      profile: { uid: 'u1', role: 'resident', status: 'active', settings: { language: 'en' } },
    });
    render(<AdminPage />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth'));
  });

  it('loads dashboard for admin users', async () => {
    if (!AdminPage) {
      AdminPage = (await import('../page')).default;
    }
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    });
    getCurrentUserWithProfileMock.mockResolvedValue({
      firebaseUser: { uid: 'admin' },
      profile: { uid: 'admin', role: 'admin', status: 'active', settings: { language: 'en' } },
    });

    listUsersMock.mockResolvedValue({
      items: [],
      lastCursor: undefined,
    });
    listTasksMock.mockResolvedValue({
      items: [],
      lastCursor: undefined,
    });
    listRotationsMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listRotationPetitionsMock.mockResolvedValue({ items: [], lastCursor: undefined });
    ensureCoreRotationsSeededMock.mockResolvedValue(undefined);

    render(<AdminPage />);

    // Wait for dashboard title to appear (it's an h1, not a button)
    await screen.findByRole('heading', { name: /Dashboard/i, level: 1 });

    // Verify dashboard sections are present (use getAllByText since there may be multiple instances)
    expect(screen.getAllByText(/Morning Meetings/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/On Call/i).length).toBeGreaterThan(0);

    // Verify links to other pages exist
    const openButtons = screen.getAllByText(/open/i);
    expect(openButtons.length).toBeGreaterThan(0);

    if ((globalThis as any).flushAllPromises) {
      await (globalThis as any).flushAllPromises();
    }
  });
});
