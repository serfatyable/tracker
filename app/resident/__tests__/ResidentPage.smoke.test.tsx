import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import ResidentPage from '../page';

vi.mock('../../../components/TopBar', () => ({ default: () => null }));
vi.mock('../../../components/resident/ResidentActiveRotationProvider', () => ({
  ResidentActiveRotationProvider: ({ children }: { children: ReactNode }) => children,
}));

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

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

describe('ResidentPage Home smoke', () => {
  beforeEach(() => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: false,
    } as any);
  });

  it('shows home dashboard with key sections', async () => {
    render(<ResidentPage />);

    // Wait for home/dashboard title to appear
    await screen.findByRole('heading', { name: /home/i, level: 1 });

    // Verify key dashboard sections are present
    expect(screen.getByText(/Required/i)).toBeInTheDocument();
    expect(screen.getByText(/Approved/i)).toBeInTheDocument();
    expect(screen.getByText(/Pending/i)).toBeInTheDocument();

    // Verify quick action buttons exist
    expect(screen.getByText(/Log activity/i)).toBeInTheDocument();
    expect(screen.getByText(/Search rotations/i)).toBeInTheDocument();
    expect(screen.getByText(/Go to active rotation/i)).toBeInTheDocument();
  });
});
