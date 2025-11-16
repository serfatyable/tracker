'use client';
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

type Props = {
  activeAssignments: Assignment[];
  allAssignments: Assignment[];
  residents: UserProfile[];
  tutors: UserProfile[];
};

type KPI = {
  key: string;
  label: string;
  value: number;
  trend?: number | null;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export default function KPICards({
  activeAssignments,
  allAssignments,
  residents,
  tutors,
}: Props): React.ReactElement {
  const { t } = useTranslation();

  const { unassignedResidentsCount, tutorLoadBalance, upcomingMeetings, pendingApprovals } =
    useMemo(() => {
      // Check against ALL assignments (not just active) to find truly unassigned residents
      const assignedResidentIds = new Set(allAssignments.map((a) => a.residentId));
      const unassigned = residents.filter(
        (r) => r.role === 'resident' && assignedResidentIds.has(r.uid) === false,
      );
      // Tutor load balance: std dev proxy (rough) - use only active assignments
      const load = new Map<string, number>();
      for (const t of tutors) load.set(t.uid, 0);
      for (const a of activeAssignments)
        for (const tid of a.tutorIds || []) load.set(tid, (load.get(tid) || 0) + 1);
      const counts = Array.from(load.values());
      const mean = counts.reduce((s, n) => s + n, 0) / (counts.length || 1);
      const variance = counts.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / (counts.length || 1);
      const stdDev = Math.sqrt(variance);
      // Pending approvals + upcoming meetings: placeholders for now
      const pending = 0;
      const upcoming = 0;
      return {
        unassignedResidentsCount: Number(unassigned.length ?? 0),
        tutorLoadBalance: Number.isFinite(stdDev) ? Number(stdDev.toFixed(1)) : 0,
        upcomingMeetings: Number(upcoming ?? 0),
        pendingApprovals: Number(pending ?? 0),
      };
    }, [activeAssignments, allAssignments, residents, tutors]);

  // Trend placeholders: null hides arrows; compute 7-day delta if data available
  const kpis: KPI[] = [
    {
      key: 'pending',
      label: t('overview.actions.pending', { defaultValue: 'Pending approvals' }) as string,
      value: pendingApprovals,
      trend: null,
      Icon: ExclamationTriangleIcon,
    },
    {
      key: 'unassigned',
      label: t('admin.kpi.unassignedResidents'),
      value: unassignedResidentsCount,
      trend: null,
      Icon: UserGroupIcon,
    },
    {
      key: 'load',
      label: t('dashboard.tutorMetricsFairness', { defaultValue: 'Tutor load balance' }) as string,
      value: tutorLoadBalance,
      trend: null,
      Icon: ChartBarIcon,
    },
    {
      key: 'upcoming',
      label: t('morningMeetings.next7', { defaultValue: 'Upcoming meetings' }) as string,
      value: upcomingMeetings,
      trend: null,
      Icon: CalendarDaysIcon,
    },
  ];

  const getCardStyle = (key: string) => {
    switch (key) {
      case 'pending':
        return 'border-l-4 border-amber-500 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10';
      case 'unassigned':
        return 'border-l-4 border-blue-500 bg-gradient-to-br from-blue-50/50 to-sky-50/50 dark:from-blue-950/10 dark:to-sky-950/10';
      case 'load':
        return 'border-l-4 border-indigo-500 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-950/10 dark:to-purple-950/10';
      case 'upcoming':
        return 'border-l-4 border-green-500 bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/10 dark:to-emerald-950/10';
      default:
        return 'border-l-4 border-gray-500';
    }
  };

  const getIconBgColor = (key: string) => {
    switch (key) {
      case 'pending':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400';
      case 'unassigned':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400';
      case 'load':
        return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';
      case 'upcoming':
        return 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400';
      default:
        return 'bg-gray-100 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((k) => (
        <div
          key={k.key}
          className={`card-levitate rounded-2xl p-5 transition-all duration-200 ${getCardStyle(k.key)}`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${getIconBgColor(k.key)}`}>
              <k.Icon className="h-6 w-6" strokeWidth={2} aria-hidden />
            </div>
            {k.trend != null && (
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  k.trend >= 0
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                }`}
              >
                {k.trend >= 0 ? (
                  <ArrowTrendingUpIcon className="h-3.5 w-3.5" />
                ) : (
                  <ArrowTrendingDownIcon className="h-3.5 w-3.5" />
                )}
                <span>{k.trend >= 0 ? `+${k.trend}` : k.trend}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-3xl font-bold tracking-tight text-foreground dark:text-white">
              {k.value}
            </div>
            <div className="text-sm font-medium text-foreground/70 dark:text-white/70">
              {k.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
