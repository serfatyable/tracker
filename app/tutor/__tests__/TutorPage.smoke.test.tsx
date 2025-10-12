import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import * as clientMod from '../../../lib/firebase/client';
import TutorPage from '../page';

// Stub TopBar to minimize noise
vi.mock('../../../components/TopBar', () => ({ default: () => null }));

const { getCurrentUserWithProfileMock } = vi.hoisted(() => ({
  getCurrentUserWithProfileMock: vi.fn(),
}));

vi.mock('../../../lib/firebase/auth', () => ({
  getCurrentUserWithProfile: getCurrentUserWithProfileMock,
}));

describe('TutorPage smoke', () => {
  beforeEach(() => {
    vi.spyOn(clientMod, 'getFirebaseStatus').mockReturnValue({
      ok: true,
      missing: [],
      usingEmulators: true,
    } as any);
    getCurrentUserWithProfileMock.mockResolvedValue({
      firebaseUser: { uid: 't1' },
      profile: { uid: 't1', role: 'tutor', status: 'active', settings: { language: 'en' } },
    });
  });

  it('renders Reflections tab', async () => {
    const user = (await import('@testing-library/user-event')).default.setup();
    render(<TutorPage />);
    const refTab = await screen.findByRole('button', { name: /Reflections/i });
    await user.click(refTab);
    await screen.findByText(/Reflections I wrote/i);
  });
});
