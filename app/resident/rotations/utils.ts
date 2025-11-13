export function applyQueryParam(params: URLSearchParams, key: string, value: string): string {
  const next = new URLSearchParams(params.toString());
  if (value.trim()) {
    next.set(key, value);
  } else {
    next.delete(key);
  }
  return next.toString();
}

const KNOWLEDGE_MATCHERS = [/knowledge/i, /ידע/];
const SKILLS_MATCHERS = [/skill/i, /מיומנויות/];
const GUIDANCE_MATCHERS = [/guidance/i, /הנחיות/];

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

function matchesKeywords(source: string | null | undefined, keywords: RegExp[]): boolean {
  if (!source) return false;
  return keywords.some((pattern) => pattern.test(source));
}

export type RotationDomainPaletteKey = 'knowledge' | 'skills' | 'guidance' | 'general';

export function inferDomainPalette(
  categoryName: string | null,
  domainName?: string | null,
): RotationDomainPaletteKey {
  const composite = `${categoryName || ''} ${domainName || ''}`;
  if (matchesKeywords(composite, KNOWLEDGE_MATCHERS)) {
    return 'knowledge';
  }
  if (matchesKeywords(composite, SKILLS_MATCHERS)) {
    return 'skills';
  }
  if (matchesKeywords(composite, GUIDANCE_MATCHERS)) {
    return 'guidance';
  }
  return 'general';
}

export function getProgressMedallionClasses(percent: number | null): string {
  if (percent === null || Number.isNaN(percent)) {
    return 'border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300';
  }
  if (percent <= 25) {
    return 'border-rose-200 bg-rose-100 text-rose-800 dark:border-rose-500/30 dark:bg-rose-950/40 dark:text-rose-100';
  }
  if (percent <= 75) {
    return 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100';
  }
  return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100';
}
