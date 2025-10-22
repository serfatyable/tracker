'use client';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import {
  UserGroupIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

type Props = {
  assignments: Assignment[];
  residents: UserProfile[];
  tutors: UserProfile[];
};

type KPI = {
  key: string;
  label: string;
  value: number;
  trend?: number | null;
  Icon: (props: any) => JSX.Element;
};

export default function KPICards({ assignments, residents, tutors }: Props) {
  const { t } = useTranslation();

  const { unassignedResidentsCount, tutorLoadBalance, upcomingMeetings, pendingApprovals } =
    useMemo(() => {
      // Placeholder computations; real data may come from other hooks
      const assignedResidentIds = new Set(assignments.map((a) => a.residentId));
      const unassigned = residents.filter(
        (r) => r.role === 'resident' && assignedResidentIds.has(r.uid) === false,
      );
      // Tutor load balance: std dev proxy (rough)
      const load = new Map<string, number>();
      for (const t of tutors) load.set(t.uid, 0);
      for (const a of assignments)
        for (const tid of a.tutorIds || []) load.set(tid, (load.get(tid) || 0) + 1);
      const counts = Array.from(load.values());
      const mean = counts.reduce((s, n) => s + n, 0) / (counts.length || 1);
      const variance = counts.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / (counts.length || 1);
      const stdDev = Math.sqrt(variance);
      // Pending approvals + upcoming meetings: placeholders for now
      const pending = 0;
      const upcoming = 0;
      return {
        unassignedResidentsCount: unassigned.length,
        tutorLoadBalance: Number.isFinite(stdDev) ? Number(stdDev.toFixed(1)) : 0,
        upcomingMeetings: upcoming,
        pendingApprovals: pending,
      };
    }, [assignments, residents, tutors]);

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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {kpis.map((k) => (
        <div key={k.key} className="rounded-2xl border p-4">
          <div className="flex items-center gap-2 mb-2 rtl:flex-row-reverse rtl:justify-end">
            <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
              <k.Icon className="h-4 w-4" stroke="currentColor" aria-hidden />
            </div>
            <div className="text-xs font-medium text-foreground/80 dark:text-white/80">{k.label}</div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-semibold tracking-tight text-foreground dark:text-white">{k.value}</div>
            {k.trend == null ? null : k.trend >= 0 ? (
              <div className="inline-flex items-center text-xs text-green-600">
                <ArrowTrendingUpIcon className="h-3.5 w-3.5" stroke="currentColor" />
                <span className="ml-0.5">+{k.trend}</span>
              </div>
            ) : (
              <div className="inline-flex items-center text-xs text-red-600">
                <ArrowTrendingDownIcon className="h-3.5 w-3.5" stroke="currentColor" />
                <span className="ml-0.5">{k.trend}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
