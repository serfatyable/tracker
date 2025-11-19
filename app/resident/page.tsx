'use client';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../components/auth/AuthGate';
import AppShell from '../../components/layout/AppShell';
import AchievementsInsights from '../../components/resident/AchievementsInsights';
import ActivityTimeline from '../../components/resident/ActivityTimeline';
import AnnouncementsCard from '../../components/resident/AnnouncementsCard';
import EnhancedKPICards from '../../components/resident/EnhancedKPICards';
import EnhancedPendingTasks from '../../components/resident/EnhancedPendingTasks';
import EnhancedQuickActions from '../../components/resident/EnhancedQuickActions';
import SmartRecommendations from '../../components/resident/SmartRecommendations';
import UpcomingSchedule from '../../components/resident/UpcomingSchedule';
import WelcomeHero from '../../components/resident/WelcomeHero';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';

import { usePageHeader } from '@/components/layout/page-header-context';
import type { PageHeaderConfig, PageHeaderMeta } from '@/components/layout/page-header-context';
import Button from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/morning-meetings/morningMeetingsUtils';
import { useUserTasks } from '@/lib/react-query/hooks';

export default function ResidentDashboard() {
  const { t, i18n } = useTranslation();
  const { rotationId: activeRotationId } = useResidentActiveRotation();
  const { nodes: activeNodes } = useRotationNodes(activeRotationId || null);
  const { tasks } = useUserTasks();
  const router = useRouter();

  const activeRotationName = useMemo(() => {
    if (!activeRotationId || !activeNodes) return null;
    return activeNodes.find((node: any) => node.id === activeRotationId)?.name || null;
  }, [activeRotationId, activeNodes]);

  const pendingCount = useMemo(
    () => tasks.filter((task) => task.status === 'pending').length,
    [tasks],
  );

  const lastActivityLabel = useMemo(() => {
    const mostRecent = tasks
      .filter((task) => task.createdAt)
      .sort((a, b) => (b.createdAt?.getTime?.() || 0) - (a.createdAt?.getTime?.() || 0))[0];
    if (!mostRecent?.createdAt)
      return t('ui.lastUpdated.never', { defaultValue: 'No activity yet' }) as string;
    const locale = i18n.language === 'he' ? 'he-IL' : 'en-US';
    return formatRelativeTime(mostRecent.createdAt.getTime(), locale);
  }, [tasks, t, i18n.language]);

  const headerConfig = useMemo<PageHeaderConfig>(
    () => ({
      title: t('ui.homeTitle', { defaultValue: 'Home' }) as string,
      description: t('ui.home.summary', {
        defaultValue: 'Track progress, resume drafts, and stay ahead on every rotation.',
      }) as string,
      breadcrumbs: [
        {
          label: t('ui.homeTitle', { defaultValue: 'Home' }) as string,
          href: '/resident',
          current: true,
        },
      ],
      meta: [
        {
          label: t('ui.activeRotation', { defaultValue: 'Active rotation' }) as string,
          value:
            activeRotationName || t('ui.home.noActiveRotation', { defaultValue: 'Unassigned' }),
        },
        {
          label: t('ui.pending', { defaultValue: 'Pending' }) as string,
          value: String(pendingCount),
          tone: pendingCount > 0 ? 'warning' : 'neutral',
        },
        {
          label: t('ui.lastUpdated.label', { defaultValue: 'Last activity' }) as string,
          value: lastActivityLabel,
        },
      ] satisfies PageHeaderMeta[],
      actions: (
        <Button
          size="sm"
          variant="secondary"
          onClick={() =>
            router.push(
              activeRotationId
                ? `/resident/rotations?selected=${activeRotationId}`
                : '/resident/rotations',
            )
          }
        >
          {t('ui.manageRotation', { defaultValue: 'Manage rotation' })}
        </Button>
      ),
    }),
    [t, router, activeRotationId, activeRotationName, pendingCount, lastActivityLabel],
  );

  usePageHeader(headerConfig);

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
