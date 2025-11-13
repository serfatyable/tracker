import { describe, expect, it } from 'vitest';

import { applyQueryParam, normalizeDomainFilter, shouldShowDesktopQuickLog } from '../utils';

describe('rotations utils', () => {
  it('applies and removes query parameters based on value', () => {
    const params = new URLSearchParams('rot=icu');
    const withSearch = applyQueryParam(params, 'search', 'airway');
    expect(withSearch).toBe('rot=icu&search=airway');

    const cleared = applyQueryParam(new URLSearchParams(withSearch), 'search', '');
    expect(cleared).toBe('rot=icu');
  });

  it('normalizes domain filters when the domain list changes', () => {
    expect(normalizeDomainFilter('Cardiology', ['Cardiology', 'Neurology'])).toBe('Cardiology');
    expect(normalizeDomainFilter('Cardiology', ['Neurology'])).toBe('all');
    expect(normalizeDomainFilter('all', [])).toBe('all');
  });

  it('determines when the desktop quick log button should be visible', () => {
    expect(shouldShowDesktopQuickLog('rot-a', 'items')).toBe(true);
    expect(shouldShowDesktopQuickLog(null, 'items')).toBe(false);
    expect(shouldShowDesktopQuickLog('rot-a', 'overview')).toBe(false);
  });
});
