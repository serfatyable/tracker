export function getLocalized<T>(opts: {
  en?: T | null;
  he?: T | null;
  fallback?: T | null;
  lang: 'en' | 'he';
}): T | null | undefined {
  const { en, he, fallback, lang } = opts;
  if (lang === 'he') {
    if (he !== undefined && he !== null && (typeof he !== 'string' || he.trim() !== '')) {
      return he as T;
    }
    if (en !== undefined && en !== null && (typeof en !== 'string' || en.trim() !== '')) {
      return en as T;
    }
    return fallback as T;
  }
  if (en !== undefined && en !== null && (typeof en !== 'string' || en.trim() !== '')) {
    return en as T;
  }
  if (he !== undefined && he !== null && (typeof he !== 'string' || he.trim() !== '')) {
    return he as T;
  }
  return fallback as T;
}


