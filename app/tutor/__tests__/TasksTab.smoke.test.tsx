import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TasksTab from '../../../components/tutor/tabs/TasksTab';

describe('TasksTab smoke', () => {
  it('renders grouped tasks and selects for bulk actions', async () => {
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
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);
    await user.click(screen.getByRole('button', { name: /approve/i }));
  });
});
