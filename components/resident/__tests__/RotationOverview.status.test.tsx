import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const successHandlerRef: { current: (() => void) | null } = { current: null };

vi.mock('../RotationPetitionDialog', () => ({
  __esModule: true,
  default: (props: { onSuccess: () => void }) => {
    successHandlerRef.current = props.onSuccess;
    return null;
  },
}));

vi.mock('../../../lib/firebase/client', () => ({
  getFirebaseApp: () => ({}),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => ({ currentUser: { uid: 'resident-123' } }),
}));

vi.mock('../../../lib/hooks/useRotationDetails', () => ({
  useRotationDetails: () => ({
    rotation: { id: 'rotation-1', name: 'Rotation 1' },
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useResidentRotationStatus', () => ({
  useResidentRotationStatus: () => ({
    status: 'inactive',
    loading: false,
    error: null,
  }),
}));

vi.mock('../../../lib/hooks/useResidentPendingPetition', () => ({
  useResidentPendingPetition: () => ({
    petition: null,
    loading: false,
    error: null,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) =>
      options?.defaultValue ?? options ?? '',
  }),
}));

import RotationOverview from '../RotationOverview';

describe('RotationOverview petition success timing', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    consoleErrorSpy.mockRestore();
    successHandlerRef.current = null;
  });

  it('does not update state after unmount when success timer completes', () => {
    const { unmount } = render(<RotationOverview rotationId="rotation-1" />);

    expect(successHandlerRef.current).toBeTruthy();

    act(() => {
      successHandlerRef.current?.();
    });

    expect(screen.getByText('Petition submitted successfully!')).toBeInTheDocument();

    unmount();

    act(() => {
      vi.runAllTimers();
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});
