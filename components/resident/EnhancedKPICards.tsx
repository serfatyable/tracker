'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { KPICardSkeleton } from '@/components/dashboard/Skeleton';
import { useResidentActiveRotation } from '@/lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '@/lib/hooks/useRotationNodes';
import { useUserTasks } from '@/lib/react-query/hooks';

export default function EnhancedKPICards() {
  const { t } = useTranslation();
  const { rotationId, loading: rotationLoading } = useResidentActiveRotation();
  const { tasks, loading: tasksLoading } = useUserTasks();
  const { nodes, loading: nodesLoading } = useRotationNodes(rotationId || null);

  // Calculate KPIs with trends
  const kpiData = useMemo(() => {
    if (!rotationId) return null;

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const leafs = nodes.filter((n) => n.rotationId === rotationId && n.type === 'leaf');
    const requiredTotal = leafs.reduce(
      (acc, n: any) => acc + (Number(n.requiredCount) || 0),
      0,
    );

    const rotationTasks = tasks.filter((t) => t.rotationId === rotationId);
    const approvedTasks = rotationTasks.filter((t) => t.status === 'approved');
    const pendingTasks = rotationTasks.filter((t) => t.status === 'pending');

    // Build capped counts per leaf
    const countsByItemId: Record<string, { approved: number; pending: number }> = {};
    rotationTasks.forEach((t) => {
      const bucket = (countsByItemId[t.itemId] = countsByItemId[t.itemId] || {
        approved: 0,
        pending: 0,
      });
      if (t.status === 'approved') bucket.approved += Number(t.count) || 0;
      else if (t.status === 'pending') bucket.pending += Number(t.count) || 0;
    });

    let approvedTotal = 0;
    let pendingTotal = 0;
    leafs.forEach((leaf: any) => {
      const req = Number(leaf.requiredCount) || 0;
      const bucket = countsByItemId[leaf.id] || { approved: 0, pending: 0 };
      const cappedApproved = Math.min(bucket.approved, req);
      approvedTotal += cappedApproved;
      pendingTotal += Math.max(0, req - cappedApproved);
    });

    // Calculate weekly trends
    const approvedThisWeek = approvedTasks.filter((t) => {
      const taskTime = (t.createdAt as any)?.toMillis?.() || 0;
      return taskTime >= oneWeekAgo;
    }).length;

    const pendingThisWeek = pendingTasks.filter((t) => {
      const taskTime = (t.createdAt as any)?.toMillis?.() || 0;
      return taskTime >= oneWeekAgo;
    }).length;

    const completionPercentage =
      requiredTotal > 0 ? Math.min(100, Math.round((approvedTotal / requiredTotal) * 100)) : 0;

    return {
      required: { value: requiredTotal, trend: 0 },
      approved: { value: approvedTotal, trend: approvedThisWeek, percentage: completionPercentage },
      pending: { value: pendingTotal, trend: pendingThisWeek },
    };
  }, [rotationId, nodes, tasks]);

  if (rotationLoading || tasksLoading || nodesLoading) {
    return <KPICardSkeleton />;
  }

  if (!kpiData) {
    return null;
  }

  function Card({
    title,
    value,
    subtitle,
    trend,
    icon,
    gradient,
    iconBg,
    percentage,
  }: {
    title: string;
    value: number;
    subtitle: string;
    trend?: number;
    icon: string;
    gradient: string;
    iconBg: string;
    percentage?: number;
  }) {
    return (
      <div
        className={`group relative overflow-hidden rounded-xl border border-gray-200/60 bg-gradient-to-br ${gradient} p-5 shadow-sm transition-all duration-300 hover:shadow-lg dark:border-gray-700/40`}
      >
        {/* Background decoration */}
        <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-white/30 blur-2xl dark:bg-white/5" />

        <div className="relative z-10">
          {/* Icon and Title */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</div>
              <div className="mt-2 text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {value}
              </div>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg} shadow-sm`}
            >
              <span className="text-2xl">{icon}</span>
            </div>
          </div>

          {/* Subtitle and Trend */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600 dark:text-gray-400">{subtitle}</div>
            {trend !== undefined && trend > 0 && (
              <div className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-xs font-medium text-teal-700 dark:bg-gray-800/60 dark:text-teal-400">
                <span>↑</span>
                <span>
                  +{trend} {t('ui.home.thisWeek', { defaultValue: 'this week' })}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar for approved card */}
          {percentage !== undefined && percentage > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/40 dark:bg-gray-800/40">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card
        title={t('ui.required') as string}
        value={kpiData.required.value}
        subtitle={t('ui.home.totalRequiredTasks', { defaultValue: 'Total required tasks' })}
        icon="📋"
        gradient="from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/20"
        iconBg="bg-blue-100 dark:bg-blue-900/50"
      />
      <Card
        title={t('ui.approved') as string}
        value={kpiData.approved.value}
        subtitle={`${kpiData.approved.percentage}% ${t('ui.complete', { defaultValue: 'complete' })}`}
        trend={kpiData.approved.trend}
        percentage={kpiData.approved.percentage}
        icon="✅"
        gradient="from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/20"
        iconBg="bg-teal-100 dark:bg-teal-900/50"
      />
      <Card
        title={t('ui.pending') as string}
        value={kpiData.pending.value}
        subtitle={t('ui.awaitingApproval', { defaultValue: 'Awaiting approval' }) as string}
        trend={kpiData.pending.trend}
        icon="⏳"
        gradient="from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/20"
        iconBg="bg-amber-100 dark:bg-amber-900/50"
      />
    </div>
  );
}
