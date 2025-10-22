'use client';

import { Suspense, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import { CardSkeleton } from '../../../components/dashboard/Skeleton';
import RotationBrowser from '../../../components/resident/RotationBrowser';
import RotationTreeMap from '../../../components/resident/rotation-views/RotationTreeMap';
import RotationDashboard from '../../../components/resident/rotation-views/RotationDashboard';
import { useResidentActiveRotation } from '../../../lib/hooks/useResidentActiveRotation';
import type { RotationNode } from '../../../types/rotations';

export default function ResidentRotationsPage() {
  const { t } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchScope, setSearchScope] = useState<'current' | 'all'>(rotationId ? 'current' : 'all');

  useEffect(() => {
    setSearchScope(rotationId ? 'current' : 'all');
  }, [rotationId]);

  return (
    <AuthGate requiredRole="resident">
      <AppShell>
        <LargeTitleHeader title={t('ui.rotations', { defaultValue: 'Rotations' }) as string} />
        <div className="app-container p-4 space-y-4">
          <div className="flex items-center gap-2">
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('ui.searchRotationsOrItems', { defaultValue: 'Search rotations or items...' }) as string}
              className="w-full rounded-md border border-muted/30 bg-transparent px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={`pill text-xs ${searchScope === 'current' ? 'ring-1 ring-primary' : ''}`}
              onClick={() => setSearchScope('current')}
              disabled={!rotationId}
              aria-pressed={searchScope === 'current'}
              title={t('ui.activeRotations', { defaultValue: 'active/all rotations' }) as string}
            >
              {t('ui.active', { defaultValue: 'Current' })}
            </button>
            <button
              type="button"
              className={`pill text-xs ${searchScope === 'all' ? 'ring-1 ring-primary' : ''}`}
              onClick={() => setSearchScope('all')}
              aria-pressed={searchScope === 'all'}
            >
              {t('ui.all', { defaultValue: 'All' })}
            </button>
          </div>
          <Suspense fallback={<CardSkeleton />}> 
            {rotationId ? (
              <RotationDashboard
                rotationId={rotationId}
                onNavigateToBrowse={() => {}}
              />
            ) : null}
            {rotationId ? (
              <div className="mt-4">
                <RotationTreeMap rotationId={rotationId} onSelectNode={() => {}} />
              </div>
            ) : null}
            <RotationBrowser
              selectedRotationId={rotationId || null}
              searchTerm={searchTerm}
              searchScope={searchScope}
              onAutoScopeAll={() => setSearchScope('all')}
              onSelectLeaf={() => {}}
            />
          </Suspense>
        </div>
      </AppShell>
    </AuthGate>
  );
}


