'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { TaskDoc } from '../../lib/firebase/db';
import { useUserTasks } from '@/lib/react-query/hooks';
import { ListSkeleton } from '../dashboard/Skeleton';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState, { ChecklistIcon } from '../ui/EmptyState';
import Select from '../ui/Select';

export default function PendingTasksList({
  activeRotationId,
  nodesById,
}: {
  activeRotationId: string | null;
  nodesById: Record<string, { name: string; rotationId: string }>;
}) {
  const { t } = useTranslation();
  const { tasks, loading } = useUserTasks();
  const [rotationFilter, setRotationFilter] = useState<'' | 'active' | 'all'>('');
  const [categoryFilter, setCategoryFilter] = useState<
    '' | 'all' | 'Knowledge' | 'Skills' | 'Guidance'
  >('');

  const list = useMemo(() => {
    const base = tasks.filter((item) => item.status === 'pending' || item.status === 'rejected');
    const byRotation =
      rotationFilter === 'active' && activeRotationId
        ? base.filter((item) => item.rotationId === activeRotationId)
        : base;
    const filtered =
      categoryFilter === 'all'
        ? byRotation
        : byRotation.filter((item) => {
            const node = nodesById[item.itemId];
            // walk up via nodesById to find category name
            return node && findCategoryName(nodesById, item.itemId) === categoryFilter;
          });

    type PendingListTask = TaskDoc & {
      duplicateCount: number;
      latestTaskId: string;
      mostRecentCreatedAt: number;
    };

    const sorted = [...filtered].sort((a, b) => getTaskTimestamp(b) - getTaskTimestamp(a));
    const deduped: PendingListTask[] = [];
    const pendingMap = new Map<string, PendingListTask>();

    sorted.forEach((task) => {
      const entry: PendingListTask = {
        ...task,
        duplicateCount: 1,
        latestTaskId: task.id,
        mostRecentCreatedAt: getTaskTimestamp(task),
      };

      if (task.status !== 'pending') {
        deduped.push(entry);
        return;
      }

      const key = `${task.itemId}__${task.rotationId}`;
      const existing = pendingMap.get(key);

      if (!existing) {
        pendingMap.set(key, entry);
        deduped.push(entry);
        return;
      }

      existing.duplicateCount += 1;

      const currentTimestamp = entry.mostRecentCreatedAt;
      if (currentTimestamp > existing.mostRecentCreatedAt) {
        existing.id = task.id;
        existing.note = task.note;
        existing.feedback = task.feedback;
        existing.createdAt = task.createdAt;
        existing.mostRecentCreatedAt = currentTimestamp;
        existing.latestTaskId = task.id;
      }
    });

    return deduped;
  }, [tasks, rotationFilter, categoryFilter, activeRotationId, nodesById]);

  function findCategoryName(
    map: Record<string, any>,
    id: string,
  ): 'Knowledge' | 'Skills' | 'Guidance' | null {
    let cur = map[id];
    const seen = new Set<string>();
    while (cur && !seen.has(cur.id)) {
      seen.add(cur.id);
      if (cur.type === 'category') return cur.name;
      cur = cur.parentId ? map[cur.parentId] : null;
    }
    return null;
  }

  if (loading) {
    return (
      <div className="card-levitate rounded border p-3">
        <ListSkeleton items={3} />
      </div>
    );
  }

  return (
    <div className="card-levitate rounded border p-3">
      <div className="mb-2 flex items-center gap-2">
        <Select
          aria-label="Rotation filter"
          value={rotationFilter}
          onChange={(e) => setRotationFilter(e.target.value as any)}
        >
          {rotationFilter === 'active' || rotationFilter === 'all' ? null : (
            <option value="" disabled>
              {t('ui.allActiveRotations', { defaultValue: 'All/Active rotations' })}
            </option>
          )}
          <option value="all">{t('ui.all', { defaultValue: 'All' })}</option>
          <option value="active">{t('ui.active', { defaultValue: 'Active' })}</option>
        </Select>
        <Select
          aria-label="Category filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
        >
          {categoryFilter === '' ? (
            <option value="" disabled>
              {t('ui.category.all', { defaultValue: 'knowledge/skills/guidance' })}
            </option>
          ) : null}
          <option value="all">{t('ui.all', { defaultValue: 'All' })}</option>
          <option value="Knowledge">{t('ui.category.knowledge') || 'knowledge'}</option>
          <option value="Skills">{t('ui.category.skills') || 'skills'}</option>
          <option value="Guidance">{t('ui.category.guidance') || 'guidance'}</option>
        </Select>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={<ChecklistIcon />}
          title={t('ui.noTasks', { defaultValue: 'No pending tasks' })}
          description={
            activeRotationId
              ? t('ui.allTasksComplete', {
                  defaultValue: 'Great work! All your tasks are approved or completed.',
                })
              : t('ui.noActiveRotation', {
                  defaultValue: 'Start a rotation to see tasks appear here.',
                })
          }
        />
      ) : (
        <ul className="space-y-1 text-sm">
          {list.map((task) => (
            <li
              key={task.status === 'pending' ? `${task.itemId}__${task.rotationId}` : task.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-[rgb(var(--border))]"
            >
              <span className="flex items-center gap-2">
                <span>{nodesById[task.itemId]?.name || task.itemId}</span>
                {task.status === 'pending' && task.duplicateCount > 1 ? (
                  <Badge
                    title={t('ui.pendingTasks.multipleSubmissionsLabel', {
                      count: task.duplicateCount,
                      defaultValue: '{{count}} pending submissions',
                    })}
                    aria-label={t('ui.pendingTasks.multipleSubmissionsLabel', {
                      count: task.duplicateCount,
                      defaultValue: '{{count}} pending submissions',
                    })}
                  >
                    {t('ui.pendingTasks.multipleSubmissionsBadge', {
                      count: task.duplicateCount,
                      defaultValue: '×{{count}}',
                    })}
                  </Badge>
                ) : null}
              </span>
              <span className="flex items-center gap-2">
                <span className="text-gray-500 dark:text-gray-400">{task.status}</span>
                <Link
                  href={`/resident/reflections/${task.latestTaskId}?taskType=${encodeURIComponent(nodesById[task.itemId]?.name || 'Task')}`}
                >
                  <Button size="sm" variant="outline">
                    Reflect
                  </Button>
                </Link>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function getTaskTimestamp(task: TaskDoc): number {
  const value = task.createdAt as any;
  if (!value) return 0;

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  if (typeof value.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {
      // ignore and fall through
    }
  }

  if (typeof value.seconds === 'number') {
    const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds / 1_000_000 : 0;
    return value.seconds * 1000 + nanos;
  }

  return 0;
}
