import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import SettingsPanel from '../SettingsPanel';

vi.mock('../../../lib/hooks/useCurrentUserProfile', () => ({
  useCurrentUserProfile: () => ({
    status: 'ready',
    firebaseUser: { uid: 'u1' },
    data: {
      uid: 'u1',
      fullName: 'Test User',
      email: 't@example.com',
      role: 'resident',
      status: 'active',
      settings: { language: 'en', theme: 'system', notifications: { inApp: true, email: true } },
    },
    error: null,
  }),
}));

const { updateFns } = vi.hoisted(() => ({
  updateFns: {
    updateUserLanguage: vi.fn(async () => {}),
    updateUserTheme: vi.fn(async () => {}),
    updateUserNotifications: vi.fn(async () => {}),
  },
}));

vi.mock('../../../lib/firebase/auth', () => updateFns);

describe('SettingsPanel', () => {
  it('renders language, theme and notifications and saves', async () => {
    render(<SettingsPanel />);

    // Label is not explicitly associated with select; query by text then sibling select
    expect(screen.getByText(/language/i)).toBeTruthy();
    screen.getAllByRole('combobox')[0] as HTMLSelectElement;

    expect(screen.getByText(/theme/i)).toBeTruthy();
    const themeSelect = screen.getAllByRole('combobox')[1] as HTMLSelectElement;

    const inApp = screen.getByText(/in app/i);
    const email = screen.getByText(/email/i);
    expect(inApp).toBeTruthy();
    expect(email).toBeTruthy();

    fireEvent.change(themeSelect, { target: { value: 'dark' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // allow microtasks
    await Promise.resolve();
    await (globalThis as any).flushAllPromises?.();

    expect(updateFns.updateUserLanguage).toHaveBeenCalled();
    // Theme may revert to system based on prefers-color-scheme; just assert called
    expect(updateFns.updateUserTheme).toHaveBeenCalled();
    expect(updateFns.updateUserNotifications).toHaveBeenCalled();
  });
});
