import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import RotationOverview from '../RotationOverview';

const rotationStatusState = {
  status: null as any,
  loading: true,
  error: null,
};

const pendingPetitionState = {
  petition: null as any,
  loading: true,
  error: null,
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: Record<string, any>) => options?.defaultValue ?? _key,
  }),
}));

vi.mock('../../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({
    status: 'ready',
    firebaseUser: { uid: 'resident-1' },
    data: null,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useRotationDetails', () => ({
  useRotationDetails: () => ({
    rotation: {
      id: 'icu',
      name: 'ICU',
      name_en: 'ICU',
      status: 'active',
    },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useResidentRotationStatus', () => ({
  useResidentRotationStatus: () => rotationStatusState,
}));

vi.mock('../../../lib/hooks/useResidentPendingPetition', () => ({
  useResidentPendingPetition: () => pendingPetitionState,
}));

describe('RotationOverview status chip', () => {
  beforeEach(() => {
    rotationStatusState.status = null;
    rotationStatusState.loading = true;
    rotationStatusState.error = null;

    pendingPetitionState.petition = null;
    pendingPetitionState.loading = true;
    pendingPetitionState.error = null;
  });

  it('transitions from inactive to waiting to active', () => {
    const { rerender } = render(<RotationOverview rotationId="icu" />);

    expect(screen.getByText(/Loading/i)).toBeInTheDocument();

    rotationStatusState.loading = false;
    rotationStatusState.status = 'inactive';
    pendingPetitionState.loading = false;
    rerender(<RotationOverview rotationId="icu" />);

    expect(screen.getAllByText(/Not Started/i)[0]).toBeInTheDocument();

    pendingPetitionState.petition = {
      id: 'petition-1',
      residentId: 'resident-1',
      rotationId: 'icu',
      type: 'activate',
      status: 'pending',
      requestedAt: {} as any,
    };
    rerender(<RotationOverview rotationId="icu" />);

    expect(screen.getByText(/Waiting for Approval/i)).toBeInTheDocument();

    pendingPetitionState.petition = null;
    rotationStatusState.status = 'active';
    rerender(<RotationOverview rotationId="icu" />);

    expect(screen.getByText(/Active/i)).toBeInTheDocument();
  });
});
