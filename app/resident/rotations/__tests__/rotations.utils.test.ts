import { describe, expect, it } from 'vitest';

import {
  applyQueryParam,
  getProgressMedallionClasses,
  inferDomainPalette,
  normalizeDomainFilter,
  shouldShowDesktopQuickLog,
} from '../utils';

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

  it('infers the correct palette key for knowledge, skills, guidance, and general domains', () => {
    expect(inferDomainPalette('Knowledge', 'Airway')).toBe('knowledge');
    expect(inferDomainPalette('מיומנויות', 'Intubation')).toBe('skills');
    expect(inferDomainPalette('הנחיות', 'Policies')).toBe('guidance');
    expect(inferDomainPalette('Other', 'Cardiology')).toBe('general');
  });

  it('returns color-coded classes for the progress medallion thresholds', () => {
    expect(getProgressMedallionClasses(null)).toContain('bg-gray-50');
    expect(getProgressMedallionClasses(10)).toContain('bg-rose-100');
    expect(getProgressMedallionClasses(50)).toContain('bg-amber-100');
    expect(getProgressMedallionClasses(90)).toContain('bg-emerald-100');
  });
});
