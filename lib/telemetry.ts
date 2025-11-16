import { logger } from './utils/logger';

function dispatchBrowserEvent(
  channel: string,
  name: string,
  payload?: Record<string, unknown>,
): void {
  if (typeof window === 'undefined') return;
  const detail = {
    name,
    payload: payload ?? {},
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent(channel, { detail }));
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[tracker:${channel}] ${name}`, 'telemetry', detail);
  }
}

export function trackAdminEvent(name: string, payload?: Record<string, unknown>): void {
  dispatchBrowserEvent('tracker:admin-event', name, payload);
}

export function trackMorningMeetingEvent(name: string, payload?: Record<string, unknown>): void {
  dispatchBrowserEvent('tracker:morning-meetings', name, payload);
}
