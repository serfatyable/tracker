import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import AdminPage from '../page';

// Stub TopBar to minimize noise
vi.mock('../../../components/TopBar', () => ({ default: () => null }));

// Hoisted mocks
const { replaceMock, getCurrentUserWithProfileMock, listUsersMock, listTasksMock, updateUsersStatusMock, updateUsersRoleMock, updateTasksStatusMock } = vi.hoisted(() => ({
    replaceMock: vi.fn(),
    getCurrentUserWithProfileMock: vi.fn(),
    listUsersMock: vi.fn(),
    listTasksMock: vi.fn(),
    updateUsersStatusMock: vi.fn(),
    updateUsersRoleMock: vi.fn(),
    updateTasksStatusMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));

vi.mock('../../../lib/firebase/auth', () => ({
    getCurrentUserWithProfile: getCurrentUserWithProfileMock,
}));

vi.mock('../../../lib/firebase/admin', () => ({
    listUsers: listUsersMock,
    listTasks: listTasksMock,
    updateUsersStatus: updateUsersStatusMock,
    updateUsersRole: updateUsersRoleMock,
    updateTasksStatus: updateTasksStatusMock,
}));

describe('AdminPage smoke', () => {
    beforeEach(() => {
        replaceMock.mockClear();
        getCurrentUserWithProfileMock.mockReset();
        listUsersMock.mockReset();
        listTasksMock.mockReset();
        updateUsersStatusMock.mockReset();
        updateUsersRoleMock.mockReset();
        updateTasksStatusMock.mockReset();
    });

    it('redirects non-admin users', async () => {
        vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({ ok: true, missing: [], usingEmulators: false });
        getCurrentUserWithProfileMock.mockResolvedValue({
            firebaseUser: { uid: 'u1' },
            profile: { uid: 'u1', role: 'resident', status: 'active', settings: { language: 'en' } },
        });
        render(<AdminPage />);
        await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/auth'));
    });

    it('loads users/tasks and performs bulk actions', async () => {
        vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({ ok: true, missing: [], usingEmulators: false });
        getCurrentUserWithProfileMock.mockResolvedValue({
            firebaseUser: { uid: 'admin' },
            profile: { uid: 'admin', role: 'admin', status: 'active', settings: { language: 'en' } },
        });

        listUsersMock.mockResolvedValue({
            items: [
                { uid: 'u1', fullName: 'Alice', email: 'alice@example.com', role: 'resident', status: 'pending', settings: { language: 'en' } },
                { uid: 'u2', fullName: 'Bob', email: 'bob@example.com', role: 'tutor', status: 'disabled', settings: { language: 'en' } },
            ],
            lastCursor: undefined,
        });
        listTasksMock.mockResolvedValue({
            items: [
                { id: 't1', userId: 'u1', rotationId: 'r1', itemId: 'i1', count: 1, requiredCount: 5, status: 'pending' },
                { id: 't2', userId: 'u2', rotationId: 'r2', itemId: 'i2', count: 2, requiredCount: 4, status: 'pending' },
            ],
            lastCursor: undefined,
        });

        updateUsersStatusMock.mockResolvedValue(undefined);
        updateUsersRoleMock.mockResolvedValue(undefined);
        updateTasksStatusMock.mockResolvedValue(undefined);

        const user = userEvent.setup();
        render(<AdminPage />);

        // Switch to Users tab (default tab is now Overview)
        await user.click(screen.getByRole('button', { name: /users/i }));
        await screen.findByText('Alice');

        // Select first user and approve
        const rows = screen.getAllByRole('row');
        const aliceRow = rows.find((r) => within(r).queryByText('Alice'))!;
        await user.click(within(aliceRow).getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: /approve/i }));
        await waitFor(() => expect(updateUsersStatusMock).toHaveBeenCalledWith({ userIds: ['u1'], status: 'active' }));

        // Change role for Bob
        const bobRow = rows.find((r) => within(r).queryByText('Bob'))!;
        await user.click(within(bobRow).getByRole('checkbox'));
        await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'admin');
        await waitFor(() => expect(updateUsersRoleMock).toHaveBeenCalledWith({ userIds: ['u2'], role: 'admin' }));

        // Switch to Tasks tab
        await user.click(screen.getByRole('button', { name: /tasks/i }));
        await screen.findByText('r1');

        // Select both tasks and approve, then reject (to hit both paths)
        const taskRows = screen.getAllByRole('row').filter((r) => within(r).queryByText(/r[12]/));
        for (const r of taskRows) await user.click(within(r).getByRole('checkbox'));
        await user.click(screen.getByRole('button', { name: /^approve$/i }));
        await waitFor(() => expect(updateTasksStatusMock).toHaveBeenCalledWith({ taskIds: ['t1', 't2'], status: 'approved' }));
        await user.click(screen.getByRole('button', { name: /^reject$/i }));
        await waitFor(() => expect(updateTasksStatusMock).toHaveBeenCalledWith({ taskIds: ['t1', 't2'], status: 'rejected' }));
    });
});


