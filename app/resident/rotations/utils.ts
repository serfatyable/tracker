export function applyQueryParam(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params.toString());
  if (value.trim()) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  return next.toString();
}

export function normalizeDomainFilter(
  current: string | 'all',
  available: string[],
): string | 'all' {
  if (current === 'all') {
    return 'all';
  }
  if (!available.length) {
    return current;
  }
  return available.includes(current) ? current : 'all';
}

export function shouldShowDesktopQuickLog(
  activeRotationId: string | null,
  view: 'overview' | 'items' | 'resources' | 'activity',
): boolean {
  return Boolean(activeRotationId) && view === 'items';
}
