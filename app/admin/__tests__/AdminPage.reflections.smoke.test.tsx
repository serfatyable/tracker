import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import AdminPage from '../page';

// Stub TopBar to minimize noise
vi.mock('../../../components/TopBar', () => ({ default: () => null }));

const {
  replaceMock,
  getCurrentUserWithProfileMock,
  ensureCoreRotationsSeededMock,
  ensureDefaultReflectionTemplatesSeededMock,
  listUsersMock,
  listTasksMock,
  listRotationsMock,
  listRotationPetitionsMock,
} = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  getCurrentUserWithProfileMock: vi.fn(),
  ensureCoreRotationsSeededMock: vi.fn(),
  ensureDefaultReflectionTemplatesSeededMock: vi.fn(),
  listUsersMock: vi.fn(),
  listTasksMock: vi.fn(),
  listRotationsMock: vi.fn(),
  listRotationPetitionsMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));

vi.mock('../../../lib/firebase/auth', () => ({
  getCurrentUserWithProfile: getCurrentUserWithProfileMock,
}));

vi.mock('../../../lib/firebase/admin', async () => {
  const actual = await vi.importActual<any>('../../../lib/firebase/admin');
  return {
    ...actual,
    ensureCoreRotationsSeeded: ensureCoreRotationsSeededMock,
    ensureDefaultReflectionTemplatesSeeded: ensureDefaultReflectionTemplatesSeededMock,
    listUsers: listUsersMock,
    listTasks: listTasksMock,
    listRotations: listRotationsMock,
    listRotationPetitions: listRotationPetitionsMock,
  };
});

describe('Admin Reflections smoke', () => {
  beforeEach(() => {
    replaceMock.mockClear();
    getCurrentUserWithProfileMock.mockReset();
    ensureCoreRotationsSeededMock.mockReset();
    ensureDefaultReflectionTemplatesSeededMock.mockReset();
    listUsersMock.mockReset();
    listTasksMock.mockReset();
    listRotationsMock.mockReset();
    listRotationPetitionsMock.mockReset();

    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    });

    getCurrentUserWithProfileMock.mockResolvedValue({
      firebaseUser: { uid: 'admin' },
      profile: { uid: 'admin', role: 'admin', status: 'active', settings: { language: 'en' } },
    });

    // Defaults that avoid loading noise
    listUsersMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listTasksMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listRotationsMock.mockResolvedValue({ items: [], lastCursor: undefined });
    listRotationPetitionsMock.mockResolvedValue({ items: [], lastCursor: undefined });
    ensureCoreRotationsSeededMock.mockResolvedValue(undefined);
    ensureDefaultReflectionTemplatesSeededMock.mockResolvedValue(undefined);
  });

  it('renders Reflections tab and calls seeding', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();

    render(<AdminPage />);

    // Open Reflections tab
    await user.click(screen.getByRole('button', { name: /Reflections/i }));

    // Seeding invoked
    await waitFor(() => expect(ensureDefaultReflectionTemplatesSeededMock).toHaveBeenCalled());

    // Templates subtab button and Submissions button render
    await screen.findByText(/Select audience/i);
    await screen.findByRole('button', { name: /Submissions/i });
  });
});
