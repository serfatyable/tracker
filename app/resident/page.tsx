'use client';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../components/auth/AuthGate';
import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import AchievementsInsights from '../../components/resident/AchievementsInsights';
import ActivityTimeline from '../../components/resident/ActivityTimeline';
import AnnouncementsCard from '../../components/resident/AnnouncementsCard';
import EnhancedKPICards from '../../components/resident/EnhancedKPICards';
import EnhancedPendingTasks from '../../components/resident/EnhancedPendingTasks';
import EnhancedQuickActions from '../../components/resident/EnhancedQuickActions';
import SmartRecommendations from '../../components/resident/SmartRecommendations';
import UpcomingSchedule from '../../components/resident/UpcomingSchedule';
import WelcomeHero from '../../components/resident/WelcomeHero';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';

export default function ResidentDashboard() {
  const { t } = useTranslation();
  const { data: _me } = useCurrentUserProfile();
  const { rotationId: activeRotationId } = useResidentActiveRotation();
  const { nodes: activeNodes } = useRotationNodes(activeRotationId || null);
  const router = useRouter();

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
        <LargeTitleHeader title={t('ui.homeTitle', { defaultValue: 'Home' }) as string} />
        <div className="app-container p-4 sm:p-6 md:p-8 space-y-6">
          {/* Welcome Hero Section */}
          <WelcomeHero />

          {/* Enhanced KPI Cards */}
          <EnhancedKPICards />

          {/* Quick Actions */}
          <EnhancedQuickActions
            onGoRotations={() => router.push('/resident/rotations')}
            onFocusSearch={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('tracker:command-palette'));
              }
            }}
            onGoActiveRotation={() => {
              if (activeRotationId) {
                router.push(`/resident/rotations?selected=${activeRotationId}`);
              } else {
                router.push('/resident/rotations');
              }
            }}
            favorites={getFavorites(activeNodes, (id) =>
              router.push(`/resident/rotations?selected=${id}`),
            )}
          />

          {/* Smart Recommendations */}
          <SmartRecommendations />

          {/* Upcoming Schedule and Activity Timeline in Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <UpcomingSchedule />
            <ActivityTimeline />
          </div>

          {/* Achievements and Weekly Insights */}
          <AchievementsInsights />

          {/* Enhanced Pending Tasks */}
          <EnhancedPendingTasks
            activeRotationId={activeRotationId || null}
            nodesById={Object.fromEntries((activeNodes || []).map((n: any) => [n.id, n])) as any}
          />

          {/* Announcements */}
          <AnnouncementsCard />
        </div>
      </AppShell>
    </AuthGate>
  );
}
