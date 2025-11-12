export function trackAdminEvent(name: string, payload?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return;
  const detail = {
    name,
    payload: payload ?? {},
    timestamp: Date.now(),
  };
  window.dispatchEvent(new CustomEvent('tracker:admin-event', { detail }));
  if (process.env.NODE_ENV !== 'production') {
     
    console.info('[tracker:admin-event]', detail);
  }
}
