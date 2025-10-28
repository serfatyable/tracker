'use client';

import { getAuth } from 'firebase/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import { CardSkeleton } from '../../../components/dashboard/Skeleton';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import DomainPickerSheet from '../../../components/resident/DomainPickerSheet';
import ItemDetailSheet from '../../../components/resident/ItemDetailSheet';
import QuickLogDialog from '../../../components/resident/QuickLogDialog';
import RotationActivity from '../../../components/resident/RotationActivity';
import RotationBrowser from '../../../components/resident/RotationBrowser';
import RotationOverview from '../../../components/resident/RotationOverview';
import RotationPickerSheet from '../../../components/resident/RotationPickerSheet';
import RotationResources from '../../../components/resident/RotationResources';
import SegmentedView from '../../../components/resident/SegmentedView';
import { getFirebaseApp } from '../../../lib/firebase/client';
import { createTask } from '../../../lib/firebase/db';
import { useResidentActiveRotation } from '../../../lib/hooks/useResidentActiveRotation';
import { useRotationsIndex } from '../../../lib/hooks/useRotationsIndex';
import type { RotationNode } from '../../../types/rotations';

export default function ResidentRotationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { rotationId } = useResidentActiveRotation();
  const rotationIndex = useRotationsIndex();
  const [searchTerm] = useState('');
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

  // Compute active rotation meta
  const active = useMemo(
    () => rotationIndex?.all?.find((r) => r.id === activeRotationId) ?? null,
    [rotationIndex, activeRotationId],
  );

  // Initialize active rotation and view from URL params
  useEffect(() => {
    const rotParam = searchParams.get('rot');
    const viewParam = searchParams.get('view') as 'overview' | 'items' | 'resources' | 'activity';
    const domainParam = searchParams.get('domain');

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
    }
  }, [searchParams, rotationId]);

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
    if (domain !== 'all') {
      params.set('domain', domain);
    } else {
      params.delete('domain');
    }
    const newUrl = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/resident/rotations${newUrl}`, { scroll: false });
  };

  // Handle item selection
  const handleItemSelect = (item: RotationNode) => {
    setSelectedItem(item);
    setItemDetailOpen(true);
  };

  // Handle log activity
  const handleLogActivity = (item: RotationNode) => {
    setSelectedLeaf(item);
    setQuickLogOpen(true);
  };

  return (
    <AuthGate requiredRole="resident">
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
                  onSelectLeaf={handleItemSelect}
                  onOpenDomainPicker={() => setDomainPickerOpen(true)}
                  onSelectDomain={(d) => handleDomainSelect(d)}
                  onDomainsComputed={(ds) => setDomainsList(ds)}
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
          {activeRotationId && view === 'items' ? (
            <div className="fixed inset-x-0 bottom-3 flex justify-center md:hidden pointer-events-none">
              <button
                type="button"
                onClick={() => setQuickLogOpen(true)}
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
          onLog={async (leaf, count, note) => {
            const uid = getAuth(getFirebaseApp()).currentUser?.uid;
            if (!uid || !leaf) return;
            await createTask({
              userId: uid,
              rotationId: leaf.rotationId,
              itemId: leaf.id,
              count,
              requiredCount: leaf.requiredCount || 0,
              note,
            });
            setOptimistic((prev) => {
              const cur = prev[leaf.id]?.pending ?? 0;
              return { ...prev, [leaf.id]: { pending: cur + (count || 0) } };
            });
            setQuickLogOpen(false);
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
        <ItemDetailSheet
          open={itemDetailOpen}
          onClose={() => setItemDetailOpen(false)}
          item={selectedItem}
          onLog={handleLogActivity}
        />
      </AppShell>
    </AuthGate>
  );
}
