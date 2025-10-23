'use client';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../components/auth/AuthGate';
import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import AnnouncementsCard from '../../components/resident/AnnouncementsCard';
import KPICardsResident from '../../components/resident/KPICardsResident';
import PendingTasksList from '../../components/resident/PendingTasksList';
import QuickActions from '../../components/resident/QuickActions';
import RecentLogs from '../../components/resident/RecentLogs';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';

export default function ResidentDashboard() {
  const { t } = useTranslation();
  const { data: _me } = useCurrentUserProfile();
  const { rotationId: activeRotationId } = useResidentActiveRotation();
  const { nodes: activeNodes } = useRotationNodes(activeRotationId || null);

  function getFavorites(
    nodes: any[] | null,
    onSelect: (id: string) => void,
  ): Array<{ id: string; name: string; onSelect: () => void }> {
    if (!nodes) return [];
    return nodes
      .filter((n: any) => n.isFavorite || n.isRecent)
      .slice(0, 5)
      .map((n: any) => ({ id: n.id, name: n.name, onSelect: () => onSelect(n.id) }));
  }

  return (
    <AuthGate requiredRole="resident">
      <AppShell>
        <LargeTitleHeader title={t('ui.home', { defaultValue: 'Home' }) as string} />
        <div className="app-container p-3 sm:p-4 md:p-6 space-y-3">
          <KPICardsResident />
          <QuickActions
            onGoRotations={() => {}}
            onFocusSearch={() => {}}
            favorites={getFavorites(activeNodes, () => {})}
          />
          <PendingTasksList
            activeRotationId={activeRotationId || null}
            nodesById={Object.fromEntries((activeNodes || []).map((n: any) => [n.id, n])) as any}
          />
          <RecentLogs
            itemIdsToNames={
              Object.fromEntries((activeNodes || []).map((n: any) => [n.id, n.name])) as any
            }
          />
          <AnnouncementsCard />
        </div>
      </AppShell>
    </AuthGate>
  );
}
