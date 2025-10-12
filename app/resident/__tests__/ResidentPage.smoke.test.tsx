import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import ResidentPage from '../page';

vi.mock('../../../components/TopBar', () => ({ default: () => null }));

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));

vi.mock('../../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({
    status: 'ready',
    firebaseUser: { uid: 'u1' },
    data: { uid: 'u1', role: 'resident', status: 'active', settings: { language: 'en' } },
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
        startDate: undefined as any,
        endDate: undefined as any,
        status: 'active',
        createdAt: undefined as any,
      },
      {
        id: 'pacu',
        name: 'PACU',
        name_en: 'PACU',
        startDate: undefined as any,
        endDate: undefined as any,
        status: 'inactive',
        createdAt: undefined as any,
      },
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useRotationNodes', () => ({
  useRotationNodes: (rotationId: string) => ({
    nodes:
      rotationId === 'icu'
        ? [
            {
              id: 'root-s',
              rotationId: 'icu',
              parentId: null,
              type: 'category',
              name: 'Skills',
              order: 0,
            },
            {
              id: 'subj',
              rotationId: 'icu',
              parentId: 'root-s',
              type: 'subject',
              name: 'Airway',
              order: 0,
            },
            {
              id: 'topic',
              rotationId: 'icu',
              parentId: 'subj',
              type: 'topic',
              name: 'Intubation',
              order: 0,
            },
            {
              id: 'leaf1',
              rotationId: 'icu',
              parentId: 'topic',
              type: 'leaf',
              name: 'ETT placement',
              order: 0,
              requiredCount: 5,
            },
          ]
        : [],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useUserTasks', () => ({
  useUserTasks: () => ({ tasks: [], loading: false, error: null }),
}));

describe('ResidentPage Rotations smoke', () => {
  beforeEach(() => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    } as any);
  });

  it('shows rotations grid and opens tree, allows +1 click', async () => {
    const user = userEvent.setup();
    render(<ResidentPage />);
    // Navigate to Rotations tab then expect ICU
    const rotButtons = await screen.findAllByRole('button', { name: /Rotations/i });
    await user.click(rotButtons[0]!);
    await screen.findByText(/ICU/i);
    // Open ICU
    await user.click(screen.getAllByText('Open')[0]!);
    await screen.findByText('Skills');
    // Expand tree and click +1
    const plus = await screen.findByRole('button', { name: '+1' });
    expect(plus).toBeInTheDocument();
  });
});
