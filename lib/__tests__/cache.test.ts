import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { getCacheValue, invalidateCache, setCacheValue } from '../firebase/cache';

describe('firebase cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('returns cached value before ttl expires', () => {
    setCacheValue('test:key', { foo: 'bar' }, 1_000);
    expect(getCacheValue<{ foo: string }>('test:key')).toEqual({ foo: 'bar' });
  });

  it('expires cached value after ttl', () => {
    setCacheValue('test:ttl', 42, 500);
    vi.advanceTimersByTime(600);
    expect(getCacheValue<number>('test:ttl')).toBeNull();
  });

  it('allows explicit invalidation', () => {
    setCacheValue('test:invalidate', 'value', 1_000);
    invalidateCache('test:invalidate');
    expect(getCacheValue<string>('test:invalidate')).toBeNull();
  });
});
