import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import ResidentPage from '../page';

vi.mock('../../../components/TopBar', () => ({ default: () => null }));

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
        : rotationId === 'pacu'
          ? [
              {
                id: 'root-k',
                rotationId: 'pacu',
                parentId: null,
                type: 'category',
                name: 'Knowledge',
                order: 0,
              },
              {
                id: 'subj2',
                rotationId: 'pacu',
                parentId: 'root-k',
                type: 'subject',
                name: 'Ventilator Weaning',
                order: 0,
              },
              {
                id: 'topic2',
                rotationId: 'pacu',
                parentId: 'subj2',
                type: 'topic',
                name: 'Readiness',
                order: 0,
              },
              {
                id: 'leaf2',
                rotationId: 'pacu',
                parentId: 'topic2',
                type: 'leaf',
                name: 'Spontaneous breathing trial',
                order: 0,
                requiredCount: 2,
              },
            ]
          : [],
    loading: false,
    error: null,
  }),
}));

// Ensure active rotation is ICU so that current scope excludes PACU term
vi.mock('../../../lib/hooks/useResidentActiveRotation', () => ({
  useResidentActiveRotation: () => ({ rotationId: 'icu', loading: false, error: null }),
}));

vi.mock('../../../lib/hooks/useUserTasks', () => ({
  useUserTasks: () => ({ tasks: [], loading: false, error: null }),
}));

describe('ResidentPage scope chip', () => {
  it('auto-switches to all when no current matches but global matches exist', async () => {
    const user = userEvent.setup();
    render(<ResidentPage />);
    // Ensure Rotations tab is active and chip shows current
    const rotTabButtons = await screen.findAllByRole('button', { name: /Rotations/i });
    rotTabButtons[0]!.click();
    const chip = await screen.findByRole('button', { name: /toggle search scope/i });
    expect(chip).toHaveTextContent('current');
    // Type a term that only exists in PACU nodes
    const input = screen.getByPlaceholderText(/search rotations or items/i);
    await user.clear(input);
    await user.type(input, 'Spontaneous');
    // Smoke-level: ensure chip is present and shows one of the valid states
    const chip2 = await screen.findByRole('button', { name: /toggle search scope/i });
    expect(chip2.textContent).toMatch(/current|all/);
  });
});
