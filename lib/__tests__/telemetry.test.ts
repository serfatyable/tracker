import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { trackAdminEvent } from '../telemetry';

describe('trackAdminEvent', () => {
  const listeners: Array<() => void> = [];

  beforeEach(() => {
    listeners.forEach((dispose) => dispose());
    listeners.length = 0;
  });

  afterEach(() => {
    listeners.forEach((dispose) => dispose());
    listeners.length = 0;
  });

  it('dispatches browser event with payload', () => {
    const handler = vi.fn();
    window.addEventListener('tracker:admin-event', handler);
    listeners.push(() => window.removeEventListener('tracker:admin-event', handler));

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    trackAdminEvent('test_event', { foo: 'bar' });
    infoSpy.mockRestore();

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0]![0] as CustomEvent<{
      name: string;
      payload: Record<string, unknown>;
      timestamp: number;
    }>;
    expect(event.detail.name).toBe('test_event');
    expect(event.detail.payload).toMatchObject({ foo: 'bar' });
    expect(event.detail.timestamp).toBeGreaterThan(0);
  });
});
