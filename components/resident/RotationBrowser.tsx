'use client';
import { getAuth } from 'firebase/auth';
import { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask } from '../../lib/firebase/db';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { getLocalized } from '../../lib/i18n/getLocalized';
import type { RotationNode } from '../../types/rotations';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { EmptyIcon } from '../ui/EmptyState';
import ProgressRing from '../ui/ProgressRing';

type Props = {
  activeRotationId: string | null;
  searchTerm: string;
  domainFilter: string | 'all';
  onSelectLeaf: (leaf: RotationNode) => void;
  onOpenDomainPicker: () => void;
  // New: allow parent to directly set a domain from top chips
  onSelectDomain?: (domain: string | 'all') => void;
  // New: report computed domains to parent for the bottom sheet
  onDomainsComputed?: (domains: string[]) => void;
  optimisticCounts?: Record<string, { pending: number }>;
};

type TreeNode = RotationNode & { children: TreeNode[] };

export default function RotationBrowser({
  activeRotationId,
  searchTerm,
  domainFilter,
  onSelectLeaf,
  onOpenDomainPicker,
  onSelectDomain,
  onDomainsComputed,
  optimisticCounts,
}: Props) {
  const { t, i18n } = useTranslation();
  const { rotationId: residentActiveRotationId } = useResidentActiveRotation();
  const { tasks } = useUserTasks();
  const { nodes, loading } = useRotationNodes(activeRotationId || null);
  const [debouncedTerm, setDebouncedTerm] = useState('');

  // Debounce search term for smoother global search UX
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedTerm(searchTerm), 250);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  // Extract domain from ancestors (skip top-level category, take next ancestor)
  const getDomain = (ancestors: string[]): string => {
    // Skip the top-level category (Knowledge/Skills/Guidance)
    const filtered = ancestors.filter(
      (a) =>
        !a.toLowerCase().includes('knowledge') &&
        !a.toLowerCase().includes('skill') &&
        !a.toLowerCase().includes('guidance') &&
        !a.toLowerCase().includes('ידע') &&
        !a.toLowerCase().includes('מיומנויות') &&
        !a.toLowerCase().includes('הנחיות'),
    );
    return filtered[0] || 'General';
  };

  // When activeRotationId is null, we need to load all nodes for "all rotations" view
  const { nodes: allNodes, loading: allLoading } = useRotationNodes(null);
  const nodesToUse = activeRotationId ? nodes : allNodes;
  const loadingToUse = activeRotationId ? loading : allLoading;

  const tree = useMemo(() => buildTree(nodesToUse), [nodesToUse]);

  // Build flat leaves with ancestry info for mobile card list
  type FlatLeaf = RotationNode & {
    categoryName: string | null;
    subjectName: string | null;
    domain: string;
    ancestors: string[];
  };

  const flatLeaves: FlatLeaf[] = useMemo(() => {
    const out: FlatLeaf[] = [];
    function walk(n: TreeNode, ancestors: TreeNode[]) {
      const nextAnc = [...ancestors, n];
      if (n.type === 'leaf') {
        const cat = ancestors.find((a) => a.type === 'category')?.name || null;
        const subj = ancestors.find((a) => a.type === 'subject')?.name || null;
        const ancestorNames = nextAnc.map((a) => a.name);
        const domain = getDomain(ancestorNames);
        out.push({
          ...(n as RotationNode),
          categoryName: cat,
          subjectName: subj,
          domain,
          ancestors: ancestorNames,
        });
      }
      n.children.forEach((c) => walk(c as TreeNode, nextAnc));
    }
    tree.forEach((r) => walk(r, []));
    return out;
  }, [tree]);

  const countsByItemId = useMemo(() => {
    const map: Record<string, { approved: number; pending: number }> = {};
    tasks.forEach((t) => {
      const bucket = (map[t.itemId] = map[t.itemId] || { approved: 0, pending: 0 });
      if (t.status === 'approved') bucket.approved += t.count || 0;
      else if (t.status === 'pending') bucket.pending += t.count || 0;
    });
    return map;
  }, [tasks]);

  const effectiveCounts = useMemo(() => {
    if (!optimisticCounts) return countsByItemId;
    const map = { ...countsByItemId };
    for (const [id, delta] of Object.entries(optimisticCounts)) {
      const bucket = (map[id] = map[id] || { approved: 0, pending: 0 });
      bucket.pending += delta.pending || 0;
    }
    return map;
  }, [countsByItemId, optimisticCounts]);

  // Overall rotation progress (across all leaves in the selected rotation only)
  const overall = useMemo(() => {
    let approved = 0;
    let required = 0;
    flatLeaves.forEach((n) => {
      const req = n.requiredCount || 0;
      const appr = effectiveCounts[n.id]?.approved || 0;
      required += req;
      approved += Math.min(appr, req);
    });
    const percent = required > 0 ? Math.round((approved / required) * 100) : 0;
    const remaining = Math.max(0, required - approved);
    return { approved, required, percent, remaining };
  }, [flatLeaves, effectiveCounts]);

  // Filters: category, domain, and status
  type CategoryFilter = 'all' | 'knowledge' | 'skills' | 'guidance';
  type StatusFilter = 'all' | 'pending' | 'approved';
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Get unique domains from current leaves with counts
  const availableDomains = useMemo(() => {
    const domainCounts: Record<string, number> = {};
    const domains = new Set<string>();

    flatLeaves.forEach((leaf) => {
      domains.add(leaf.domain);
      domainCounts[leaf.domain] = (domainCounts[leaf.domain] || 0) + 1;
    });

    return {
      domains: Array.from(domains).sort(),
      counts: domainCounts,
    };
  }, [flatLeaves]);

  // Inform parent about currently available domains for the picker
  useEffect(() => {
    onDomainsComputed && onDomainsComputed(availableDomains.domains);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableDomains.domains.join('|')]);

  // Get top domains (most frequent in current results)
  const topDomains = useMemo(() => {
    return availableDomains.domains
      .sort((a, b) => (availableDomains.counts[b] || 0) - (availableDomains.counts[a] || 0))
      .slice(0, 4);
  }, [availableDomains]);

  function canLog(leaf: RotationNode): boolean {
    // Check if the resident has an active assignment to this rotation
    return leaf.rotationId === residentActiveRotationId;
  }

  async function onLog(leaf: RotationNode, count: number, note?: string) {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const req = leaf.requiredCount || 0;
    await createTask({
      userId: uid,
      rotationId: leaf.rotationId,
      itemId: leaf.id,
      count,
      requiredCount: req,
      note,
    });
  }

  // Compute filtered list for cards based on rotation, search, category, domain, and status
  const filteredCards: FlatLeaf[] = useMemo(() => {
    const term = debouncedTerm.trim().toLowerCase();
    function matchesRotation(n: FlatLeaf) {
      if (!activeRotationId) return true; // Show all when no rotation selected
      return n.rotationId === activeRotationId;
    }
    function matchesTerm(n: FlatLeaf) {
      if (!term) return true;
      const display =
        getLocalized<string>({
          he: (n as any).name_he as any,
          en: (n as any).name_en as any,
          fallback: n.name as any,
          lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
        }) || n.name;
      const hay = [display, n.mcqUrl || '', ...(n.links || []).map((l) => l.href || '')]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    }
    function matchesCategory(n: FlatLeaf) {
      if (categoryFilter === 'all') return true;
      const cat = (n.categoryName || '').toLowerCase();
      if (categoryFilter === 'knowledge') return cat.includes('knowledge') || cat.includes('ידע');
      if (categoryFilter === 'skills') return cat.includes('skill') || cat.includes('מיומנויות');
      if (categoryFilter === 'guidance') return cat.includes('guidance') || cat.includes('הנחיות');
      return true;
    }
    function matchesDomain(n: FlatLeaf) {
      if (domainFilter === 'all') return true;
      return n.domain === domainFilter;
    }
    function matchesStatus(n: FlatLeaf) {
      const approved = effectiveCounts[n.id]?.approved || 0;
      const pending = effectiveCounts[n.id]?.pending || 0;
      const req = n.requiredCount || 0;
      switch (statusFilter) {
        case 'approved':
          return req > 0 && approved >= req;
        case 'pending':
          return pending > 0;
        default:
          return true;
      }
    }
    const base = flatLeaves.filter(
      (n) =>
        matchesRotation(n) &&
        matchesTerm(n) &&
        matchesCategory(n) &&
        matchesDomain(n) &&
        matchesStatus(n),
    );
    return base;
  }, [
    flatLeaves,
    activeRotationId,
    debouncedTerm,
    i18n.language,
    categoryFilter,
    domainFilter,
    statusFilter,
    effectiveCounts,
  ]);

  // Group by domain for section headers with progress
  const groupedByDomain = useMemo(() => {
    const by: Record<
      string,
      { items: FlatLeaf[]; totals: { approved: number; required: number } }
    > = {};
    for (const n of filteredCards) {
      const key = n.domain;
      const bucket = by[key] || { items: [], totals: { approved: 0, required: 0 } };
      bucket.items.push(n);
      const req = n.requiredCount || 0;
      const appr = effectiveCounts[n.id]?.approved || 0;
      bucket.totals.required += req;
      bucket.totals.approved += Math.min(appr, req);
      by[key] = bucket;
    }
    return by;
  }, [filteredCards, effectiveCounts]);

  // Simple windowing (50 per batch per spec)
  const BATCH = 50;
  const [visibleCount, setVisibleCount] = useState(BATCH);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Reset windowing when activeRotationId changes
  useEffect(() => setVisibleCount(BATCH), [activeRotationId]);
  useEffect(
    () => setVisibleCount(BATCH),
    [debouncedTerm, categoryFilter, statusFilter, domainFilter],
  );
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          setVisibleCount((v) => v + BATCH);
        }
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [sentinelRef]);

  const domainKeys = useMemo(() => Object.keys(groupedByDomain), [groupedByDomain]);
  const flatForWindowing = useMemo(
    () => domainKeys.flatMap((k) => groupedByDomain[k]!.items.map((it) => ({ key: k, item: it }))),
    [domainKeys, groupedByDomain],
  );

  const windowed = flatForWindowing.slice(0, visibleCount);
  const hasMore = flatForWindowing.length > windowed.length;

  const clearFilters = useCallback(() => {
    setCategoryFilter('all');
    setStatusFilter('all');
    // Note: domainFilter is controlled by parent, so we don't reset it here
  }, []);

  // Base set for status counts (apply rotation/term/category/domain, but not status)
  const baseForStatusCounts = useMemo(() => {
    const term = debouncedTerm.trim().toLowerCase();
    function matchesRotation(n: FlatLeaf) {
      if (!activeRotationId) return true;
      return n.rotationId === activeRotationId;
    }
    function matchesTerm(n: FlatLeaf) {
      if (!term) return true;
      const hay = [n.name, n.mcqUrl || '', ...(n.links || []).map((l) => l.href || '')]
        .join(' ')
        .toLowerCase();
      return hay.includes(term);
    }
    function matchesCategory(n: FlatLeaf) {
      if (categoryFilter === 'all') return true;
      const cat = (n.categoryName || '').toLowerCase();
      if (categoryFilter === 'knowledge') return cat.includes('knowledge') || cat.includes('ידע');
      if (categoryFilter === 'skills') return cat.includes('skill') || cat.includes('מיומנויות');
      if (categoryFilter === 'guidance') return cat.includes('guidance') || cat.includes('הנחיות');
      return true;
    }
    function matchesDomain(n: FlatLeaf) {
      if (domainFilter === 'all') return true;
      return n.domain === domainFilter;
    }
    return flatLeaves.filter(
      (n) => matchesRotation(n) && matchesTerm(n) && matchesCategory(n) && matchesDomain(n),
    );
  }, [flatLeaves, activeRotationId, debouncedTerm, categoryFilter, domainFilter]);

  const statusCounts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    for (const n of baseForStatusCounts) {
      const req = n.requiredCount || 0;
      const appr = effectiveCounts[n.id]?.approved || 0;
      const pend = effectiveCounts[n.id]?.pending || 0;
      if (req > 0 && appr >= req) approved += 1;
      if (pend > 0) pending += 1;
    }
    return { all: baseForStatusCounts.length, approved, pending };
  }, [baseForStatusCounts, effectiveCounts]);

  const pendingLabel = t('ui.pending', { defaultValue: 'Pending' }) as string;

  return (
    <div className="space-y-3">
      {/* Header bar: rotation title + tiny progress ring (overall, not filtered) + remaining count */}
      {activeRotationId ? (
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <ProgressRing
            size={18}
            stroke={2}
            percent={overall.percent}
            label={`${overall.percent}%`}
          />
          <span aria-hidden className="text-xs">
            {overall.approved}/{overall.required}
          </span>
          {overall.remaining > 0 ? (
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {t('ui.remainingShort', {
                count: overall.remaining,
                defaultValue: `Remaining ${overall.remaining}`,
              })}
            </span>
          ) : null}
        </div>
      ) : null}
      {/* Consolidated filter toolbar: categories (left) + status (right with counts) */}
      <div className="rounded-xl border bg-gray-50 dark:bg-gray-900/30 px-2 py-2 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          {/* Categories segmented */}
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {(
              [
                { key: 'all', label: t('ui.all', { defaultValue: 'All' }) },
                { key: 'knowledge', label: t('ui.knowledge', { defaultValue: 'Knowledge' }) },
                { key: 'skills', label: t('ui.skills', { defaultValue: 'Skills' }) },
                { key: 'guidance', label: t('ui.guidance', { defaultValue: 'Guidance' }) },
              ] as Array<{ key: CategoryFilter; label: string }>
            ).map((c) => (
              <button
                key={c.key}
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-muted hover:bg-muted/70 text-gray-700 dark:text-gray-300 ${
                  categoryFilter === c.key
                    ? 'ring-1 ring-primary-token bg-primary/10 text-primary'
                    : ''
                }`}
                onClick={() => setCategoryFilter(c.key)}
                aria-pressed={categoryFilter === c.key}
              >
                {c.label}
              </button>
            ))}
          </div>

          {/* Status with color accents and counts */}
          <div className="flex gap-1">
            {(
              [
                {
                  key: 'all',
                  label: t('ui.all', { defaultValue: 'All' }),
                  cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
                  count: statusCounts.all,
                },
                {
                  key: 'pending',
                  label: t('ui.pending', { defaultValue: 'Pending' }),
                  cls: '!bg-amber-100 !text-amber-900 dark:!bg-amber-900/50 dark:!text-amber-100',
                  count: statusCounts.pending,
                },
                {
                  key: 'approved',
                  label: t('ui.approved', { defaultValue: 'Approved' }),
                  cls: '!bg-green-100 !text-green-900 dark:!bg-green-900/50 dark:!text-green-100',
                  count: statusCounts.approved,
                },
              ] as Array<{ key: StatusFilter; label: string; cls: string; count: number }>
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap bg-muted hover:bg-muted/70 text-gray-700 dark:text-gray-300 ${
                  statusFilter === s.key ? `ring-1 ring-primary-token ${s.cls}` : ''
                }`}
                onClick={() => setStatusFilter(s.key)}
                aria-pressed={statusFilter === s.key}
              >
                {s.label}
                <span className="ml-1 text-[10px] opacity-75">({s.count})</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Domains row: prominent pills with counts */}
      <div
        className="flex gap-2 overflow-x-auto scrollbar-hide"
        aria-label={t('ui.domains', { defaultValue: 'Domains' }) as string}
      >
        {topDomains.map((domain) => (
          <button
            key={domain}
            type="button"
            className={`px-4 py-2 rounded-full text-xs font-medium bg-white dark:bg-[rgb(var(--surface-elevated))] border hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface))] whitespace-nowrap ${
              domainFilter === domain ? 'ring-1 ring-primary-token' : ''
            }`}
            onClick={() => (onSelectDomain ? onSelectDomain(domain) : onOpenDomainPicker())}
            aria-pressed={domainFilter === domain}
            aria-label={`Domain: ${domain} ${domainFilter === domain ? 'selected' : 'unselected'}`}
          >
            {domain}
            {availableDomains.counts[domain] && (
              <span className="ml-1 text-[10px] opacity-75">
                ({availableDomains.counts[domain]})
              </span>
            )}
          </button>
        ))}
        <button
          type="button"
          className="px-4 py-2 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 whitespace-nowrap"
          onClick={onOpenDomainPicker}
          aria-label={t('ui.moreDomains', { defaultValue: 'More domains' })}
        >
          {t('ui.moreDomains', { defaultValue: 'More domains' })}
        </button>
      </div>

      {/* Active filter chips (only when any filter is active) */}
      {(categoryFilter !== 'all' || statusFilter !== 'all' || domainFilter !== 'all') && (
        <div className="flex items-center gap-2 flex-wrap text-xs mt-1">
          <span className="text-muted-foreground">
            {t('ui.filters', { defaultValue: 'Filters' })}:
          </span>
          {categoryFilter !== 'all' && (
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-gray-700 dark:text-gray-300"
              onClick={() => setCategoryFilter('all')}
            >
              {(t('ui.category', { defaultValue: 'Category' }) as any) || 'Category'}:{' '}
              {categoryFilter} ×
            </button>
          )}
          {domainFilter !== 'all' && (
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-gray-700 dark:text-gray-300"
              onClick={() => onSelectDomain && onSelectDomain('all')}
            >
              {(t('ui.domain', { defaultValue: 'Domain' }) as any) || 'Domain'}: {domainFilter} ×
            </button>
          )}
          {statusFilter !== 'all' && (
            <button
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted text-gray-700 dark:text-gray-300"
              onClick={() => setStatusFilter('all')}
            >
              {t('ui.status', { defaultValue: 'Status' })}: {statusFilter} ×
            </button>
          )}
          <button
            className="ml-auto text-xs text-blue-600 dark:text-blue-400 hover:underline"
            onClick={clearFilters}
          >
            {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
          </button>
        </div>
      )}

      {/* Cards list */}
      <div role="list" className="space-y-2">
        {loadingToUse ? (
          // Skeletons for first screenful
          Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="card-levitate h-16 animate-pulse"
              role="listitem"
              aria-busy="true"
            />
          ))
        ) : windowed.length === 0 ? (
          <div className="py-6 text-center">
            <EmptyIcon size={36} />
            <div className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-50">
              {t('ui.noResults', { defaultValue: 'No results' })}
            </div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {t('ui.clearFiltersToSeeAll', {
                defaultValue: 'Try clearing filters or changing your search.',
              })}
            </div>
            <div className="mt-3">
              <Button onClick={clearFilters} size="sm">
                {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {windowed.map(({ key, item }, idx) => {
              const approved = effectiveCounts[item.id]?.approved || 0;
              const pending = effectiveCounts[item.id]?.pending || 0;
              const req = item.requiredCount || 0;
              const isComplete = req > 0 && approved >= req;
              const subtitle =
                item.subjectName ||
                item.ancestors.slice(0, -1).slice(-1)[0] ||
                item.categoryName ||
                '';
              // Section header when first item of a domain in windowed sequence
              const isFirstInDomain = idx === 0 || windowed[idx - 1]!.key !== key;
              const groupTotals = groupedByDomain[key]?.totals || { approved: 0, required: 0 };
              const percent =
                req > 0 ? Math.min(100, Math.round((approved / Math.max(1, req)) * 100)) : null;
              const progressStyles = isComplete
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-100'
                : approved > 0
                  ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/40 dark:bg-sky-900/20 dark:text-sky-100'
                  : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5 dark:text-gray-300';
              const completionBadgeTone = isComplete
                ? 'ring-emerald-200 bg-emerald-50 text-emerald-700 dark:ring-emerald-500/40 dark:bg-emerald-900/30 dark:text-emerald-100'
                : approved > 0
                  ? 'ring-sky-200 bg-sky-50 text-sky-700 dark:ring-sky-500/40 dark:bg-sky-900/30 dark:text-sky-100'
                  : 'ring-gray-200 bg-gray-50 text-gray-600 dark:ring-gray-600/40 dark:bg-gray-900/40 dark:text-gray-200';

              return (
                <div key={item.id} className="space-y-2">
                  {isFirstInDomain ? (
                    <div className="flex items-center justify-between pt-4">
                      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        {key}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium ring-1 ring-inset ring-gray-200/80 bg-transparent text-gray-600 dark:ring-white/15 dark:text-gray-200"
                      >
                        {groupTotals.approved}/{groupTotals.required}
                      </Badge>
                    </div>
                  ) : null}
                  <div
                    role="listitem"
                    tabIndex={0}
                    onClick={() => onSelectLeaf(item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectLeaf(item);
                      }
                    }}
                    className="card-levitate group relative w-full cursor-pointer overflow-hidden border border-transparent bg-white/80 text-left transition-colors hover:border-gray-200/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-token dark:bg-[rgb(var(--surface))] dark:hover:border-white/10"
                    aria-label={item.name}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex flex-1 items-start gap-3">
                        <div
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border text-sm font-semibold transition-colors ${progressStyles}`}
                          aria-hidden
                        >
                          {percent !== null ? <span>{percent}%</span> : <span>–</span>}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          {subtitle ? (
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              {subtitle}
                            </div>
                          ) : null}
                          <div className="text-sm font-semibold leading-5 text-gray-900 dark:text-gray-50">
                            {debouncedTerm.trim() ? highlight(item.name, debouncedTerm) : item.name}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 sm:min-w-[160px]">
                        <div className="flex flex-wrap justify-end gap-2">
                          {req > 0 ? (
                            <Badge
                              variant="outline"
                              className={`text-xs font-semibold tracking-tight ${completionBadgeTone}`}
                              title={`${approved}/${req}`}
                              aria-label={`${approved} of ${req} approved`}
                            >
                              {approved}/{req}
                            </Badge>
                          ) : null}
                          {pending > 0 ? (
                            <Badge
                              variant="outline"
                              className="text-[11px] font-semibold tracking-tight ring-amber-200 bg-amber-50 text-amber-700 dark:ring-amber-500/40 dark:bg-amber-900/30 dark:text-amber-100"
                              aria-label={`${pendingLabel} ${pending}`}
                            >
                              {pendingLabel} +{pending}
                            </Badge>
                          ) : null}
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="self-end"
                          disabled={!canLog(item)}
                          onClick={(e) => {
                            console.log('[DEBUG] +1 button clicked for:', item.name);
                            e.stopPropagation();
                            onLog(item, 1);
                          }}
                          title={
                            !canLog(item)
                              ? 'Only available for your currently active rotation'
                              : 'Submit for approval'
                          }
                        >
                          +1
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {hasMore ? <div ref={sentinelRef} className="h-8 w-full" aria-hidden /> : null}
          </>
        )}
      </div>

      {/* Load more fallback */}
      {hasMore ? (
        <div className="flex justify-center pt-1">
          <Button size="sm" onClick={() => setVisibleCount((v) => v + BATCH)}>
            {t('ui.loadMore', { defaultValue: 'Load more' })}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function buildTree(nodes: RotationNode[]): TreeNode[] {
  const map: Record<string, TreeNode> = {};
  nodes.forEach((n) => {
    map[n.id] = { ...(n as any), children: [] };
  });
  const roots: TreeNode[] = [];
  nodes.forEach((n) => {
    if (n.parentId) {
      const parent = map[n.parentId];
      if (parent && map[n.id]) parent.children.push(map[n.id]!);
    } else {
      if (map[n.id]) roots.push(map[n.id]!);
    }
  });
  return roots.sort((a, b) => a.order - b.order);
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="bg-yellow-200 text-yellow-900 dark:bg-yellow-600/40 dark:text-yellow-100">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  );
}
