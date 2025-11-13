'use client';

import { getAuth } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import { CardSkeleton } from '../../../components/dashboard/Skeleton';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import DomainPickerSheet from '../../../components/resident/DomainPickerSheet';
import ItemDetailSheet from '../../../components/resident/ItemDetailSheet';
import NodeDetailsSheet from '../../../components/resident/NodeDetailsSheet';
import QuickLogDialog from '../../../components/resident/QuickLogDialog';
import RotationActivity from '../../../components/resident/RotationActivity';
import RotationBrowser from '../../../components/resident/RotationBrowser';
import RotationOverview from '../../../components/resident/RotationOverview';
import RotationPickerSheet from '../../../components/resident/RotationPickerSheet';
import RotationResources from '../../../components/resident/RotationResources';
import SegmentedView from '../../../components/resident/SegmentedView';
import { UndoToastProvider, useUndoToast } from '../../../components/resident/UndoToastProvider';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import { getFirebaseApp } from '../../../lib/firebase/client';
import { createTask, deleteTask } from '../../../lib/firebase/db';
import { useResidentActiveRotation } from '../../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../../lib/hooks/useRotationNodes';
import { useRotationsIndex } from '../../../lib/hooks/useRotationsIndex';
import type { RotationNode } from '../../../types/rotations';

import { applyQueryParam, normalizeDomainFilter, shouldShowDesktopQuickLog } from './utils';

export default function ResidentRotationsPage() {
  return (
    <AuthGate requiredRole="resident">
      <UndoToastProvider>
        <ResidentRotationsPageInner />
      </UndoToastProvider>
    </AuthGate>
  );
}

function ResidentRotationsPageInner() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rotationId } = useResidentActiveRotation();
  const rotationIndex = useRotationsIndex();
  const { showToast, showUndoToast } = useUndoToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeRotationId, setActiveRotationId] = useState<string | null>(null);
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [selectedLeaf, setSelectedLeaf] = useState<RotationNode | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [view, setView] = useState<'overview' | 'items' | 'resources' | 'activity'>('items');
  const [domainFilter, setDomainFilter] = useState<string | 'all'>('all');
  const [domainPickerOpen, setDomainPickerOpen] = useState(false);
  const [itemDetailOpen, setItemDetailOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RotationNode | null>(null);
  const [optimistic, setOptimistic] = useState<Record<string, { pending: number }>>({});
  const [domainsList, setDomainsList] = useState<string[]>([]);
  const [recentLeafIds, setRecentLeafIds] = useState<string[]>([]);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [selectedNodeDetail, setSelectedNodeDetail] = useState<{
    node: RotationNode;
    ancestors: RotationNode[];
  } | null>(null);

  // Compute active rotation meta
  const active = useMemo(
    () => rotationIndex?.all?.find((r) => r.id === activeRotationId) ?? null,
    [rotationIndex, activeRotationId],
  );

  const { nodes: rotationNodes, loading: rotationNodesLoading } = useRotationNodes(
    activeRotationId ?? null,
  );
  const rotationNodesById = useMemo(() => {
    const map = new Map<string, RotationNode>();
    rotationNodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [rotationNodes]);

  const previousRotationRef = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (previousRotationRef.current === activeRotationId) {
      return;
    }
    setSelectedLeaf(null);
    setRecentLeafIds([]);
    setNodeDetailsOpen(false);
    setSelectedNodeDetail(null);
    if (previousRotationRef.current !== undefined) {
      setDomainFilter('all');
      setDomainPickerOpen(false);
      const params = new URLSearchParams(searchParams);
      const query = applyQueryParam(params, 'domain', '');
      const newUrl = query ? `?${query}` : '';
      router.replace(`/resident/rotations${newUrl}`, { scroll: false });
    }
    previousRotationRef.current = activeRotationId;
  }, [activeRotationId, router, searchParams]);

  const leafOptions = useMemo(() => {
    if (!rotationNodes.length)
      return [] as Array<{ id: string; node: RotationNode; title: string; trail?: string }>;
    const byId = new Map(rotationNodes.map((node) => [node.id, node]));

    return rotationNodes
      .filter((node) => node.type === 'leaf')
      .map((leaf) => {
        const ancestors: string[] = [];
        let parentId = leaf.parentId;
        while (parentId) {
          const parent = byId.get(parentId);
          if (!parent) break;
          ancestors.push(parent.name);
          parentId = parent.parentId;
        }
        const trail = ancestors.reverse();
        return {
          id: leaf.id,
          node: leaf,
          title: leaf.name,
          trail: trail.length ? trail.join(' • ') : undefined,
        };
      })
      .sort((a, b) => {
        const aTrail = a.trail ? `${a.trail} • ${a.title}` : a.title;
        const bTrail = b.trail ? `${b.trail} • ${b.title}` : b.title;
        return aTrail.localeCompare(bTrail, undefined, { sensitivity: 'base' });
      });
  }, [rotationNodes]);

  const leafOptionById = useMemo(() => {
    const map = new Map<string, (typeof leafOptions)[number]>();
    leafOptions.forEach((opt) => map.set(opt.id, opt));
    return map;
  }, [leafOptions]);

  const recentLeaves = useMemo(
    () =>
      recentLeafIds
        .map((id) => leafOptionById.get(id))
        .filter((opt): opt is (typeof leafOptions)[number] => Boolean(opt)),
    [leafOptionById, recentLeafIds],
  );

  // Initialize active rotation and view from URL params
  useEffect(() => {
    const rotParam = searchParams.get('rot');
    const viewParam = searchParams.get('view') as 'overview' | 'items' | 'resources' | 'activity';
    const domainParam = searchParams.get('domain');
    const searchParam = searchParams.get('search') ?? '';

    if (rotParam) {
      setActiveRotationId(rotParam);
    } else if (rotationId) {
      setActiveRotationId(rotationId);
    } else {
      setActiveRotationId(null);
    }

    if (viewParam && ['overview', 'items', 'resources', 'activity'].includes(viewParam)) {
      setView(viewParam);
    }

    if (domainParam) {
      setDomainFilter(domainParam);
    } else {
      setDomainFilter('all');
    }

    setSearchTerm((prev) => (prev === searchParam ? prev : searchParam));
  }, [searchParams, rotationId]);

  useEffect(() => {
    const normalized = normalizeDomainFilter(domainFilter, domainsList);
    if (normalized === domainFilter) return;
    setDomainFilter(normalized);
    const params = new URLSearchParams(searchParams);
    const query = applyQueryParam(params, 'domain', normalized === 'all' ? '' : normalized);
    const newUrl = query ? `?${query}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  }, [domainFilter, domainsList, router, searchParams]);

  // Sync URL when activeRotationId changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (activeRotationId) {
      params.set('rot', activeRotationId);
    } else {
      params.delete('rot');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  }, [activeRotationId, searchParams, router]);

  // Update document title when active rotation changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = active?.name ? `${active.name} · Rotations` : 'Rotations';
    }
  }, [active?.name]);

  // Handle rotation selection
  const handleRotationSelect = (id: string | null) => {
    setActiveRotationId(id);
    setPickerOpen(false);

    // Update URL without navigation
    const params = new URLSearchParams(searchParams);
    if (id) {
      params.set('rot', id);
    } else {
      params.delete('rot');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  };

  // Handle view change
  const handleViewChange = (newView: 'overview' | 'items' | 'resources' | 'activity') => {
    setView(newView);
    const params = new URLSearchParams(searchParams);
    if (newView !== 'items') {
      params.set('view', newView);
    } else {
      params.delete('view');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  };

  // Handle domain selection
  const handleDomainSelect = (domain: string | 'all') => {
    setDomainFilter(domain);
    const params = new URLSearchParams(searchParams);
    const query = applyQueryParam(params, 'domain', domain === 'all' ? '' : domain);
    const newUrl = query ? `?${query}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  };

  const handleSearchTermChange = (value: string) => {
    setSearchTerm(value);
    const params = new URLSearchParams(searchParams);
    const query = applyQueryParam(params, 'search', value);
    const newUrl = query ? `?${query}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  };

  // Handle item selection
  const handleItemSelect = (item: RotationNode) => {
    setSelectedItem(item);
    setItemDetailOpen(true);
  };

  // Handle log activity
  const handleLeafSelection = useCallback((leaf: RotationNode | null) => {
    setSelectedLeaf(leaf);
    if (!leaf) return;
    setRecentLeafIds((prev) => {
      const next = [leaf.id, ...prev.filter((id) => id !== leaf.id)];
      return next.slice(0, 5);
    });
  }, []);

  const handleShowNodeDetails = useCallback(
    (nodeId: string) => {
      const nodeToView = rotationNodesById.get(nodeId);
      if (!nodeToView) return;
      const ancestorStack: RotationNode[] = [];
      let parentId = nodeToView.parentId;
      while (parentId) {
        const parent = rotationNodesById.get(parentId);
        if (!parent) break;
        ancestorStack.push(parent);
        parentId = parent.parentId;
      }
      setSelectedNodeDetail({
        node: nodeToView,
        ancestors: ancestorStack.reverse(),
      });
      setNodeDetailsOpen(true);
    },
    [rotationNodesById],
  );

  const handleLogActivity = (item: RotationNode) => {
    handleLeafSelection(item);
    setQuickLogOpen(true);
  };

  const handleQuickLogOpen = () => {
    setSelectedLeaf(null);
    setQuickLogOpen(true);
  };

  const applyOptimisticDelta = useCallback((leafId: string, delta: number) => {
    setOptimistic((prev) => {
      const current = prev[leafId]?.pending ?? 0;
      const next = current + delta;
      if (next <= 0) {
        const { [leafId]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [leafId]: { pending: next } };
    });
  }, []);

  const dispatchTasksRefresh = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('userTasks:refresh'));
    }
  }, []);

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('ui.rotations', { defaultValue: 'Rotations' }) as string}
        subtitle={active?.name ?? t('ui.allRotations')}
      />

      {/* Sticky rotation scope chip header */}
      <div className="sticky top-[env(safe-area-inset-top)] z-10 px-4 pt-2">
        <div className="rounded-xl border bg-blue-50 dark:bg-blue-900/20 backdrop-blur px-3 py-2 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{t('ui.currentRotation')}</span>
              <span
                data-testid="active-rotation-pill"
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800/40 dark:text-blue-100"
              >
                {active?.name ?? t('ui.allRotations')}
                {active && (
                  <button
                    type="button"
                    className="ml-0.5 -mr-0.5 text-blue-700 hover:text-blue-900 dark:text-blue-200 dark:hover:text-blue-100"
                    aria-label={t('ui.clear')}
                    onClick={() => setActiveRotationId(null)}
                  >
                    ×
                  </button>
                )}
              </span>
            </div>
            <button
              type="button"
              className="text-xs text-blue-700 dark:text-blue-300 hover:underline"
              onClick={() => setPickerOpen(true)}
            >
              {t('ui.browseAll', { defaultValue: 'Browse all' })}
            </button>
          </div>
        </div>
        <span className="sr-only" aria-live="polite">
          {active ? `Current rotation ${active.name}` : t('ui.allRotations')}
        </span>
      </div>

      <div className="app-container p-4 pt-2 space-y-3 pb-24 pad-safe-b">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <label htmlFor="rotation-search" className="sr-only">
              {t('ui.searchRotationsOrItems', { defaultValue: 'Search rotations or items...' })}
            </label>
            <Input
              id="rotation-search"
              value={searchTerm}
              onChange={(event) => handleSearchTermChange(event.target.value)}
              placeholder={
                t('ui.searchRotationsOrItems', {
                  defaultValue: 'Search rotations or items...',
                }) as string
              }
              aria-label={
                t('ui.searchRotationsOrItems', {
                  defaultValue: 'Search rotations or items...',
                }) as string
              }
            />
            {searchTerm ? (
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                onClick={() => handleSearchTermChange('')}
                aria-label={t('ui.clearSearch', { defaultValue: 'Clear search' }) as string}
              >
                ×
              </button>
            ) : null}
          </div>
          {shouldShowDesktopQuickLog(activeRotationId, view) ? (
            <Button
              type="button"
              onClick={handleQuickLogOpen}
              className="hidden md:inline-flex md:shrink-0"
              leftIcon={
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="h-4 w-4"
                  aria-hidden="true"
                >
                  <path d="M12 4.5a.75.75 0 01.75.75V11h5.75a.75.75 0 010 1.5H12.75v5.75a.75.75 0 01-1.5 0V12.5H5.5a.75.75 0 010-1.5h5.75V5.25A.75.75 0 0112 4.5z" />
                </svg>
              }
              data-testid="desktop-quick-log"
            >
              {t('ui.logActivity', { defaultValue: 'Log activity' })}
            </Button>
          ) : null}
        </div>
        {/* Segmented view control */}
        <SegmentedView activeTab={view} onTabChange={handleViewChange} />

        <Suspense fallback={<CardSkeleton />}>
          <div
            id="rotation-content"
            role="tabpanel"
            aria-labelledby={activeRotationId ? `rotation-${activeRotationId}` : 'rotation-all'}
          >
            {view === 'overview' && <RotationOverview rotationId={activeRotationId} />}
            {view === 'items' && (
              <RotationBrowser
                activeRotationId={activeRotationId}
                searchTerm={searchTerm}
                domainFilter={domainFilter}
                nodes={rotationNodes}
                nodesLoading={rotationNodesLoading}
                onSelectLeaf={handleItemSelect}
                onOpenDomainPicker={() => setDomainPickerOpen(true)}
                onSelectDomain={(d) => handleDomainSelect(d)}
                onDomainsComputed={(ds) => setDomainsList(ds)}
                onShowNodeDetails={handleShowNodeDetails}
                optimisticCounts={optimistic}
              />
            )}
            {view === 'resources' && (
              <RotationResources
                rotationId={activeRotationId}
                onOpenDomainPicker={() => setDomainPickerOpen(true)}
              />
            )}
            {view === 'activity' && <RotationActivity rotationId={activeRotationId} />}
          </div>
        </Suspense>
        {/* Sticky CTA FAB */}
        {shouldShowDesktopQuickLog(activeRotationId, view) ? (
          <div className="fixed inset-x-0 bottom-3 flex justify-center md:hidden pointer-events-none">
            <button
              type="button"
              onClick={handleQuickLogOpen}
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full px-4 py-3 bg-blue-600 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 active:scale-95 transition pad-safe-b"
              aria-label={t('ui.logActivity', { defaultValue: 'Log activity' }) as string}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-5 w-5"
              >
                <path d="M12 4.5a.75.75 0 01.75.75V11h5.75a.75.75 0 010 1.5H12.75v5.75a.75.75 0 01-1.5 0V12.5H5.5a.75.75 0 010-1.5h5.75V5.25A.75.75 0 0112 4.5z" />
              </svg>
              <span className="text-sm font-semibold">
                {t('ui.logActivity', { defaultValue: 'Log activity' })}
              </span>
            </button>
          </div>
        ) : null}
      </div>
      <QuickLogDialog
        open={quickLogOpen}
        onClose={() => setQuickLogOpen(false)}
        leaf={selectedLeaf}
        onSelectLeaf={handleLeafSelection}
        leafOptions={leafOptions}
        recentLeaves={recentLeaves}
        onLog={async (leaf, count, note) => {
          const uid = getAuth(getFirebaseApp()).currentUser?.uid;
          if (!uid || !leaf) {
            showToast({
              message: t('ui.logError', { defaultValue: 'Failed to log' }) as string,
              variant: 'error',
            });
            return;
          }
          try {
            const created = await createTask({
              userId: uid,
              rotationId: leaf.rotationId,
              itemId: leaf.id,
              count,
              requiredCount: leaf.requiredCount || 0,
              note,
            });
            const delta = count || 0;
            if (delta) {
              applyOptimisticDelta(leaf.id, delta);
            }
            handleLeafSelection(leaf);
            setQuickLogOpen(false);
            dispatchTasksRefresh();
            showUndoToast({
              message: t('ui.logUndoPrompt', {
                count,
                defaultValue: 'Logged +1 pending item.',
              }) as string,
              variant: 'success',
              actionLabel: t('ui.undo', { defaultValue: 'Undo' }) as string,
              duration: 10000,
              onAction: async () => {
                if (delta) {
                  applyOptimisticDelta(leaf.id, -delta);
                }
                try {
                  await deleteTask(created.id);
                } catch (error) {
                  if (delta) {
                    applyOptimisticDelta(leaf.id, delta);
                  }
                  console.error('Failed to undo task from quick log', error);
                  showToast({
                    message: t('toasts.failedToUndo', { defaultValue: 'Failed to undo' }) as string,
                    variant: 'error',
                  });
                  return;
                }
                dispatchTasksRefresh();
                showToast({
                  message: t('ui.logUndoSuccess', { defaultValue: 'Log entry removed.' }) as string,
                  variant: 'success',
                });
              },
            });
          } catch (error) {
            console.error('Failed to log activity from quick dialog', error);
            showToast({
              message: t('ui.logError', { defaultValue: 'Failed to log' }) as string,
              variant: 'error',
            });
          }
        }}
      />
      <RotationPickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        activeId={activeRotationId}
        onSelect={handleRotationSelect}
        index={rotationIndex}
      />
      <DomainPickerSheet
        open={domainPickerOpen}
        onClose={() => setDomainPickerOpen(false)}
        domains={domainsList}
        active={domainFilter}
        onSelect={handleDomainSelect}
      />
      <NodeDetailsSheet
        open={nodeDetailsOpen}
        onClose={() => {
          setNodeDetailsOpen(false);
          setSelectedNodeDetail(null);
        }}
        node={selectedNodeDetail?.node ?? null}
        ancestors={selectedNodeDetail?.ancestors ?? []}
        onSelectNode={handleShowNodeDetails}
      />
      <ItemDetailSheet
        open={itemDetailOpen}
        onClose={() => setItemDetailOpen(false)}
        item={selectedItem}
        onLog={handleLogActivity}
      />
    </AppShell>
  );
}
