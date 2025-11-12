const SYNONYM_GROUPS: string[][] = [
  [
    'pph',
    'postpartum hemorrhage',
    'post-partum hemorrhage',
    'postpartum haemorrhage',
    'post partum hemorrhage',
    'obstetric hemorrhage',
  ],
  ['hemorrhage', 'haemorrhage', 'bleeding'],
  ['oncology', 'oncologic', 'cancer', 'neoplasm'],
  ['obgyn', 'ob gyn', 'obstetrics', 'obstetric', 'gynecology', 'gynecologic', "women's health"],
  ['er', 'ed', 'emergency department', 'emergency medicine'],
  ['icu', 'intensive care unit', 'critical care'],
  ['cv', 'curriculum vitae', 'resume'],
  ['bp', 'blood pressure', 'hypertension'],
  ['mi', 'myocardial infarction', 'heart attack'],
  ['bcls', 'basic cardiac life support', 'cpr'],
];

const NORMALIZED_GROUPS: string[][] = SYNONYM_GROUPS.map((group) =>
  group.map((entry) => normalizeForSearch(entry)).filter((entry) => entry.length > 0),
);

const SYNONYM_LOOKUP: Map<string, Set<string>> = (() => {
  const lookup = new Map<string, Set<string>>();
  for (const group of NORMALIZED_GROUPS) {
    const groupSet = new Set(group);
    for (const term of group) {
      const existing = lookup.get(term) ?? new Set<string>();
      for (const synonym of groupSet) {
        existing.add(synonym);
      }
      lookup.set(term, existing);
    }
  }
  return lookup;
})();

export function normalizeForSearch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function expandQuerySynonyms(rawQuery: string): string[] {
  const normalized = normalizeForSearch(rawQuery);
  if (!normalized) return [];

  const segments = normalized.split(' ').filter(Boolean);

  const variants = new Set<string>();
  variants.add(normalized);
  for (const segment of segments) {
    variants.add(segment);
  }

  const expanded = expandFromLookup(normalized);
  for (const synonym of expanded) {
    variants.add(synonym);
  }

  for (const segment of segments) {
    const segmentSynonyms = expandFromLookup(segment);
    for (const synonym of segmentSynonyms) {
      variants.add(synonym);
    }
  }

  return Array.from(variants);
}

function expandFromLookup(term: string): Set<string> {
  const queue = [term];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current || visited.has(current)) continue;
    visited.add(current);
    const synonyms = SYNONYM_LOOKUP.get(current);
    if (!synonyms) continue;
    for (const synonym of synonyms) {
      if (!visited.has(synonym)) {
        queue.push(synonym);
      }
    }
  }

  visited.delete(term);
  return visited;
}

export function createSynonymMatcher(rawQuery: string) {
  const variants = expandQuerySynonyms(rawQuery);
  if (variants.length === 0) {
    return () => true;
  }

  return (candidate: string | null | undefined): boolean => {
    if (!candidate) return false;
    const normalizedCandidate = normalizeForSearch(candidate);
    if (!normalizedCandidate) return false;
    return variants.some((variant) => normalizedCandidate.includes(variant));
  };
}
