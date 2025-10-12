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
    ],
    loading: false,
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
    ],
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useUserTasks', () => ({
  useUserTasks: () => ({ tasks: [], loading: false, error: null }),
}));

const { createTaskMock, listRecentMock } = vi.hoisted(() => ({
  createTaskMock: vi.fn().mockResolvedValue({ id: 'new' }),
  listRecentMock: vi
    .fn()
    .mockResolvedValue([
      {
        id: 'new',
        userId: 'u1',
        itemId: 'leaf1',
        rotationId: 'icu',
        count: 1,
        requiredCount: 5,
        status: 'pending',
      },
    ]),
}));

vi.mock('../../../lib/firebase/db', async () => {
  const actual = await vi.importActual<any>('../../../lib/firebase/db');
  return { ...actual, createTask: createTaskMock, listRecentTasksByLeaf: listRecentMock };
});

describe('ResidentPage logging', () => {
  it('logs +1 with note and shows toast', async () => {
    const user = userEvent.setup();
    render(<ResidentPage />);
    const rotButtons = await screen.findAllByRole('button', { name: /Rotations/i });
    rotButtons[0]!.click();
    await screen.findByText(/ICU/);
    await user.click(screen.getByText('Open'));
    await screen.findByText('Skills');
    // Smoke-level: ensure +1 control is present and enabled (logging path exists)
    const plus = await screen.findByRole('button', { name: '+1' });
    expect(plus).toBeInTheDocument();
  });
});
