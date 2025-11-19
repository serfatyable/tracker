import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import TasksTab from '../../../components/tutor/tabs/TasksTab';

const { mockGetDocs } = vi.hoisted(() => ({
  mockGetDocs: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  getDocs: mockGetDocs,
  connectFirestoreEmulator: vi.fn(),
}));

describe('TasksTab smoke', () => {
  it('renders grouped tasks and selects for bulk actions', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'line',
          data: () => ({
            rotationId: 'icu',
            parentId: 'skills',
            type: 'leaf',
            name: 'Central line placement',
            order: 0,
          }),
        },
        {
          id: 'airway',
          data: () => ({
            rotationId: 'icu',
            parentId: 'skills',
            type: 'leaf',
            name: 'Airway management',
            order: 1,
          }),
        },
      ],
    });
    const residents = [
      {
        uid: 'r1',
        role: 'resident',
        status: 'active',
        settings: { language: 'en' },
        fullName: 'Alice',
      } as any,
    ];
    const tasks = [
      {
        id: 't1',
        userId: 'r1',
        rotationId: 'icu',
        itemId: 'line',
        count: 1,
        requiredCount: 3,
        status: 'pending',
      } as any,
      {
        id: 't2',
        userId: 'r1',
        rotationId: 'icu',
        itemId: 'airway',
        count: 2,
        requiredCount: 5,
        status: 'pending',
      } as any,
    ];
    const approve = vi.fn();
    const reject = vi.fn();
    const user = userEvent.setup();
    render(
      <TasksTab
        residents={residents as any}
        tasks={tasks as any}
        onBulkApprove={approve}
        onBulkReject={reject}
      />,
    );
    await screen.findByText('Alice');
    await screen.findByText('Central line placement');
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]!);
    await user.click(screen.getByRole('button', { name: /approve/i }));
  });
});
