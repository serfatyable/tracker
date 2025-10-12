import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Ensure router is mocked for components using useRouter
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import * as hooks from '../../../lib/hooks/useCurrentUserProfile';
import ResidentPage from '../page';

describe('Resident Page', () => {
    it('shows skeleton while loading', () => {
        vi.spyOn(hooks, 'useCurrentUserProfile').mockReturnValue({ status: 'loading', firebaseUser: null, data: null, error: null } as any);
        const { container } = render(<ResidentPage />);
        expect(container).toBeTruthy();
    });
});


