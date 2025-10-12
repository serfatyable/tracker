import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ResidentsTab from '../../../components/tutor/tabs/ResidentsTab';

describe('ResidentsTab smoke', () => {
  it('renders resident cards with petition badge and actions', async () => {
    const meUid = 't1';
    const residents = [
      {
        uid: 'r1',
        role: 'resident',
        status: 'active',
        settings: { language: 'en' },
        fullName: 'Alice',
      } as any,
    ];
    const rotations = [{ id: 'icu', name: 'ICU' } as any];
    const assignments = [
      { id: 'a1', residentId: 'r1', rotationId: 'icu', tutorIds: ['t1'] } as any,
    ];
    const petitions = [
      { id: 'p1', residentId: 'r1', rotationId: 'icu', type: 'activate', status: 'pending' } as any,
    ];
    const owned = new Set(['icu']);
    render(
      <ResidentsTab
        meUid={meUid}
        residents={residents as any}
        assignments={assignments as any}
        rotations={rotations as any}
        petitions={petitions as any}
        ownedRotationIds={owned}
        onApprove={async () => {}}
        onDeny={async () => {}}
        onSelfAssign={async () => {}}
        onUnassignSelf={async () => {}}
      />,
    );
    await screen.findByText('Alice');
    await screen.findByText('ICU');
    await screen.findByText(/Activate/i);
  });
});
