import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import RotationOwnersEditor from '../RotationOwnersEditor';

const { getRotationOwnersMock, setRotationOwnersMock, listUsersMock } = vi.hoisted(() => ({
  getRotationOwnersMock: vi.fn(),
  setRotationOwnersMock: vi.fn(),
  listUsersMock: vi.fn(),
}));

vi.mock('../../../../lib/firebase/admin', async () => {
  const actual = await vi.importActual<any>('../../../../lib/firebase/admin');
  return {
    ...actual,
    getRotationOwners: getRotationOwnersMock,
    setRotationOwners: setRotationOwnersMock,
    listUsers: listUsersMock,
  };
});

describe('RotationOwnersEditor smoke', () => {
  beforeEach(() => {
    getRotationOwnersMock.mockReset();
    setRotationOwnersMock.mockReset();
    listUsersMock.mockReset();
  });

  it('loads owners, allows adding and saving', async () => {
    getRotationOwnersMock.mockResolvedValue(['t1']);
    listUsersMock.mockResolvedValue({
      items: [
        {
          uid: 't1',
          fullName: 'Tutor One',
          role: 'tutor',
          status: 'active',
          settings: { language: 'en' },
        },
        {
          uid: 't2',
          fullName: 'Tutor Two',
          role: 'tutor',
          status: 'active',
          settings: { language: 'en' },
        },
      ],
      lastCursor: undefined,
    });
    setRotationOwnersMock.mockResolvedValue(undefined);

    const user = userEvent.setup();
    render(<RotationOwnersEditor rotationId="rot1" />);

    // Existing owner is shown
    await screen.findByText('Tutor One');

    // Select Tutor Two and add
    const select = screen.getByRole('combobox');
    await user.selectOptions(select, 't2');
    await user.click(screen.getByRole('button', { name: /add/i }));

    // Now both owners appear
    await screen.findByText('Tutor Two');

    // Save
    await user.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(setRotationOwnersMock).toHaveBeenCalledWith('rot1', ['t1', 't2']));
  });
});
