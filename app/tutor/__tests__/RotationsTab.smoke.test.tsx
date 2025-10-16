import { render, screen } from '@testing-library/react';

import RotationsTab from '../../../components/tutor/tabs/RotationsTab';

describe('RotationsTab smoke', () => {
  it('renders owned rotation cards with metrics', async () => {
    const meUid = 't1';
    const rotations = [
      { id: 'icu', name: 'ICU', ownerTutorIds: ['t1'] } as any,
      { id: 'or', name: 'OR', ownerTutorIds: [] } as any,
    ];
    const assignments = [{ id: 'a1', residentId: 'r1', rotationId: 'icu' } as any];
    const residents = [
      {
        uid: 'r1',
        role: 'resident',
        status: 'active',
        settings: { language: 'en' },
        fullName: 'Alice',
      } as any,
    ];
    const petitions = [
      { id: 'p1', residentId: 'r1', rotationId: 'icu', type: 'activate', status: 'pending' } as any,
    ];
    render(
      <RotationsTab
        meUid={meUid}
        rotations={rotations as any}
        assignments={assignments as any}
        residents={residents as any}
        petitions={petitions as any}
      />,
    );
    await screen.findByText('ICU');
    await screen.findByText(/Residents:/i);
    await screen.findByText(/Pending petitions:/i);
  });
});
