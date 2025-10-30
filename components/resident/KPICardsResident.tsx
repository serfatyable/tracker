'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { KPICardSkeleton } from '../dashboard/Skeleton';

export default function KPICardsResident() {
  const { t } = useTranslation();
  const { rotationId, loading: rotationLoading } = useResidentActiveRotation();
  const { tasks, loading: tasksLoading } = useUserTasks();
  const { nodes, loading: nodesLoading } = useRotationNodes(rotationId || null);

  // Calculate KPIs - must be called before any conditional returns
  const { requiredTotal, approvedTotal, pendingTotal } = useMemo(() => {
    if (!rotationId) return { requiredTotal: 0, approvedTotal: 0, pendingTotal: 0 };
    const leafs = nodes.filter((n) => n.rotationId === rotationId && n.type === 'leaf');
    const requiredTotal = leafs.reduce((acc, n: any) => acc + (Number(n.requiredCount) || 0), 0);
    const approvedTotal = tasks
      .filter((t) => t.rotationId === rotationId && t.status === 'approved')
      .reduce((acc, t) => acc + (Number(t.count) || 0), 0);
    const pendingTotal = tasks
      .filter((t) => t.rotationId === rotationId && t.status === 'pending')
      .reduce((acc, t) => acc + (Number(t.count) || 0), 0);
    return { requiredTotal, approvedTotal, pendingTotal };
  }, [rotationId, nodes, tasks]);

  // Show loading state while any data is loading
  if (rotationLoading || tasksLoading || nodesLoading) {
    return <KPICardSkeleton />;
  }

  function Card({ title, value, subtle }: { title: string; value: number; subtle: string }) {
    return (
      <div className="card-levitate rounded border p-3 border-muted/12">
        <div className="text-sm font-medium text-foreground/80 dark:text-white/80">{title}</div>
        <div className="text-3xl font-semibold tracking-tight text-foreground dark:text-white">
          {value}
        </div>
        <div className="text-xs text-muted">{subtle}</div>
      </div>
    );
  }

  const pct =
    requiredTotal > 0 ? Math.min(100, Math.round((approvedTotal / requiredTotal) * 100)) : 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Card
        title={t('ui.required') as string}
        value={requiredTotal}
        subtle={String(t('ui.active') || '')}
      />
      <Card
        title={t('ui.approved') as string}
        value={approvedTotal}
        subtle={`${pct}% ${t('ui.complete') || 'complete'}`}
      />
      <Card
        title={t('ui.pending') as string}
        value={pendingTotal}
        subtle={t('ui.awaitingApproval') as string}
      />
    </div>
  );
}
