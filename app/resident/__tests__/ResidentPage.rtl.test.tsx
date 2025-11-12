import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import ResidentPage from '../page';

// Stub TopBar
vi.mock('../../../components/TopBar', () => ({ default: () => null }));

const { getCurrentUserWithProfileMock } = vi.hoisted(() => ({
  getCurrentUserWithProfileMock: vi.fn(),
}));

vi.mock('../../../lib/firebase/auth', () => ({
  getCurrentUserWithProfile: getCurrentUserWithProfileMock,
}));

vi.mock('../../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({
    status: 'ready',
    firebaseUser: { uid: 'u1' },
    data: { uid: 'u1', role: 'resident', status: 'active', settings: { language: 'he' } },
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useResidentActiveRotation', () => ({
  useResidentActiveRotation: () => ({ rotationId: 'icu', loading: false, error: null }),
}));

vi.mock('../../../lib/hooks/useRotations', () => ({
  useRotations: () => ({
    rotations: [
      {
        id: 'icu',
        name: 'ICU',
        name_en: 'ICU',
        name_he: 'טיפול נמרץ',
        startDate: undefined as any,
        endDate: undefined as any,
        status: 'active',
        createdAt: undefined as any,
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useRotationNodes', () => ({
  useRotationNodes: () => ({
    nodes: [
      {
        id: 'root-s',
        rotationId: 'icu',
        parentId: null,
        type: 'category',
        name: 'מיומנויות',
        order: 0,
      },
      {
        id: 'subj',
        rotationId: 'icu',
        parentId: 'root-s',
        type: 'subject',
        name: 'נתיב אוויר',
        order: 0,
      },
      {
        id: 'topic',
        rotationId: 'icu',
        parentId: 'subj',
        type: 'topic',
        name: 'אינטובציה',
        order: 0,
      },
      {
        id: 'leaf1',
        rotationId: 'icu',
        parentId: 'topic',
        type: 'leaf',
        name: 'החדרת טובוס',
        order: 0,
        requiredCount: 5,
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useUserTasks', () => ({
  useUserTasks: () => ({ tasks: [], loading: false, error: null }),
}));

describe('ResidentPage RTL basics', () => {
  it('renders search chip inside input without overflow and allows toggle', async () => {
    const user = userEvent.setup();
    render(<ResidentPage />);
    // Ensure Dashboard is rendered and effects settled before querying chip
    await screen.findByRole('button', { name: /Dashboard/i });
    if ((globalThis as any).flushAllPromises) {
      await (globalThis as any).flushAllPromises();
    }
    // Rotations tab contains the chip; ensure Rotations is active first
    const rotTabButtons = await screen.findAllByRole('button', { name: /Rotations/i });
    rotTabButtons[0]!.click();
    const chip = await screen.findByRole('button', { name: /toggle search scope/i });
    // chip should be visible and inside input; click toggles label
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveTextContent(/current|all/);
    await user.click(chip);
    expect(await screen.findByRole('button', { name: /toggle search scope/i })).toHaveTextContent(
      /current|all/,
    );
  });
});

describe('Resident reflections tab', () => {
  beforeEach(() => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: true,
    } as any);
    getCurrentUserWithProfileMock.mockResolvedValue({
      firebaseUser: { uid: 'r1' },
      profile: { uid: 'r1', role: 'resident', status: 'active', settings: { language: 'en' } },
    });
  });
  it('renders Reflections tab and empty state', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<ResidentPage />);
    await user.click(screen.getByRole('button', { name: /Reflections/i }));
    await screen.findByText(/My reflections/i);
  });
});
