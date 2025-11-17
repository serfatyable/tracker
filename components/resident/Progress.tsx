'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useResidentProgress } from '../../lib/hooks/useResidentProgress';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import Badge from '../ui/Badge';
import EmptyState, { ChecklistIcon } from '../ui/EmptyState';

export default function Progress() {
  const { t } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const { nodes } = useRotationNodes(rotationId || null);
  const { tasks } = useUserTasks();
  const { roots, totals } = useResidentProgress(rotationId || null, tasks, nodes);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const kpi = useMemo(
    () => ({
      required: totals.required,
      approved: totals.approved,
      pending: totals.pending,
      percent: totals.percent,
    }),
    [totals],
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card
          title={t('ui.required') as string}
          value={kpi.required}
          subtle={String(t('ui.active') || '')}
        />
        <Card
          title={t('ui.approved') as string}
          value={kpi.approved}
          subtle={`${kpi.percent}% ${t('ui.complete') || 'complete'}`}
        />
        <Card
          title={t('ui.pending') as string}
          value={kpi.pending}
          subtle={t('ui.awaitingApproval') as string}
        />
      </div>

      <div className="rounded-md border border-gray-200 dark:border-[rgb(var(--border))]">
        {roots.length === 0 ? (
          <EmptyState
            icon={<ChecklistIcon size={40} />}
            title={t('ui.noItems', { defaultValue: 'No items' })}
            description={t('ui.noProgressItems', {
              defaultValue: 'Start a rotation to track your progress.',
            })}
            className="py-6"
          />
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-[rgb(var(--border))]">
            {roots.map((r) => (
              <NodeRow
                key={r.id}
                node={r}
                level={0}
                open={open[r.id] ?? true}
                setOpen={(v) => setOpen((m: Record<string, boolean>) => ({ ...m, [r.id]: v }))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Card({ title, value, subtle }: { title: string; value: number; subtle: string }) {
  return (
    <div className="card-levitate rounded border p-3">
      <div className="text-sm text-muted">{title}</div>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-xs text-muted">{subtle}</div>
    </div>
  );
}

function NodeRow({
  node,
  level,
  open,
  setOpen,
}: {
  node: any;
  level: number;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const isLeaf = node.children.length === 0;
  const pct =
    node.requiredCount > 0
      ? Math.min(100, Math.round((node.approvedCount / node.requiredCount) * 100))
      : 0;
  return (
    <div>
      <div
        className="flex items-center gap-2 p-2"
        style={{ paddingInlineStart: `${8 + level * 16}px` }}
      >
        {!isLeaf ? (
          <button
            className="text-xs text-gray-600 dark:text-gray-400"
            onClick={() => setOpen(!open)}
          >
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="text-xs text-transparent">▸</span>
        )}
        <span className="text-sm">{node.name}</span>
        <div className="ml-auto flex items-center gap-2">
          {!isLeaf ? (
            <Badge>
              {node.approvedCount}/{node.requiredCount}
            </Badge>
          ) : (
            <ProgressBar
              percent={pct}
              approved={node.approvedCount}
              required={node.requiredCount}
              pending={node.pendingCount}
            />
          )}
        </div>
      </div>
      {!isLeaf && open ? (
        <div>
          {node.children.map((c: any) => (
            <NodeRow key={c.id} node={c} level={level + 1} open={true} setOpen={() => {}} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ProgressBar({
  percent,
  approved,
  required,
  pending,
}: {
  percent: number;
  approved: number;
  required: number;
  pending: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="w-40">
      <div className="h-2 w-full rounded bg-gray-200 dark:bg-[rgb(var(--surface-depressed))] overflow-hidden">
        <div className="h-2 bg-green-500 rtl:float-right" style={{ width: `${percent}%` }} />
      </div>
      <div className="text-[11px] text-gray-500 dark:text-[rgb(var(--muted))]">
        {approved}/{required} ({pending} {String(t('ui.pending')).toLowerCase()})
      </div>
    </div>
  );
}
