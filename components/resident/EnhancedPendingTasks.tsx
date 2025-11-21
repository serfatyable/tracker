'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ListSkeleton } from '@/components/dashboard/Skeleton';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState, { ChecklistIcon } from '@/components/ui/EmptyState';
import type { TaskDoc } from '@/lib/firebase/db';
import { useUserTasks } from '@/lib/react-query/hooks';

type CategoryFilter = 'all' | 'Knowledge' | 'Skills' | 'Guidance';

const CATEGORY_ACCENTS: Record<CategoryFilter, { active: string; inactive: string }> = {
  all: {
    active:
      'border-gray-900 bg-gray-900 text-white shadow-sm dark:border-gray-100 dark:bg-gray-100 dark:text-gray-900',
    inactive:
      'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800/50',
  },
  Knowledge: {
    active:
      'border-sky-400 bg-sky-50 text-sky-700 shadow-sm dark:border-sky-500/70 dark:bg-sky-900/30 dark:text-sky-100',
    inactive:
      'border-sky-200 text-sky-700/90 hover:border-sky-300 hover:bg-sky-50/70 dark:border-sky-800 dark:text-sky-200 dark:hover:border-sky-600 dark:hover:bg-sky-900/40',
  },
  Skills: {
    active:
      'border-emerald-400 bg-emerald-50 text-emerald-700 shadow-sm dark:border-emerald-500/70 dark:bg-emerald-900/30 dark:text-emerald-100',
    inactive:
      'border-emerald-200 text-emerald-700/90 hover:border-emerald-300 hover:bg-emerald-50/70 dark:border-emerald-800 dark:text-emerald-200 dark:hover:border-emerald-600 dark:hover:bg-emerald-900/40',
  },
  Guidance: {
    active:
      'border-purple-400 bg-purple-50 text-purple-700 shadow-sm dark:border-purple-500/70 dark:bg-purple-900/30 dark:text-purple-100',
    inactive:
      'border-purple-200 text-purple-700/90 hover:border-purple-300 hover:bg-purple-50/70 dark:border-purple-800 dark:text-purple-200 dark:hover:border-purple-600 dark:hover:bg-purple-900/40',
  },
};

export default function EnhancedPendingTasks({
  activeRotationId,
  nodesById,
}: {
  activeRotationId: string | null;
  nodesById: Record<string, { name: string; rotationId: string }>;
}) {
  const { t } = useTranslation();
  const { tasks, loading } = useUserTasks();
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');

  const list = useMemo(() => {
    const base = tasks.filter((item) => item.status === 'pending' || item.status === 'rejected');
    const byRotation =
      activeRotationId != null
        ? base.filter((item) => item.rotationId === activeRotationId)
        : base;
    const filtered =
      categoryFilter === 'all'
        ? byRotation
        : byRotation.filter((item) => {
            const node = nodesById[item.itemId];
            return node && findCategoryName(nodesById, item.itemId) === categoryFilter;
          });

    type PendingListTask = TaskDoc & {
      duplicateCount: number;
      latestTaskId: string;
      mostRecentCreatedAt: number;
      priority: 'high' | 'medium' | 'low';
    };

    const sorted = [...filtered].sort((a, b) => getTaskTimestamp(b) - getTaskTimestamp(a));
    const deduped: PendingListTask[] = [];
    const pendingMap = new Map<string, PendingListTask>();

    sorted.forEach((task) => {
      // Calculate priority based on status and age
      const taskAge = Date.now() - getTaskTimestamp(task);
      const daysOld = taskAge / (1000 * 60 * 60 * 24);

      let priority: 'high' | 'medium' | 'low' = 'low';
      if (task.status === 'rejected') {
        priority = 'high';
      } else if (daysOld > 7) {
        priority = 'medium';
      }

      const entry: PendingListTask = {
        ...task,
        duplicateCount: 1,
        latestTaskId: task.id,
        mostRecentCreatedAt: getTaskTimestamp(task),
        priority,
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

    // Sort by priority
    return deduped.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [tasks, categoryFilter, activeRotationId, nodesById]);

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

  function getPriorityConfig(priority: 'high' | 'medium' | 'low') {
    const configs = {
      high: {
        border: 'border-red-300 dark:border-red-800',
        bg: 'bg-red-50 dark:bg-red-950/20',
        indicator: 'bg-red-500',
        label: t('ui.home.priority.high', { defaultValue: 'High' }),
        icon: '🔴',
      },
      medium: {
        border: 'border-amber-300 dark:border-amber-800',
        bg: 'bg-amber-50 dark:bg-amber-950/20',
        indicator: 'bg-amber-500',
        label: t('ui.home.priority.medium', { defaultValue: 'Medium' }),
        icon: '🟡',
      },
      low: {
        border: 'border-gray-300 dark:border-gray-700',
        bg: 'bg-white dark:bg-gray-800/50',
        indicator: 'bg-gray-400',
        label: t('ui.home.priority.low', { defaultValue: 'Low' }),
        icon: '⚪',
      },
    };
    return configs[priority];
  }

  if (loading) {
    return (
      <div className="card-levitate rounded-xl border p-5">
        <ListSkeleton items={3} />
      </div>
    );
  }

  const pendingCount = list.filter((t) => t.status === 'pending').length;
  const rejectedCount = list.filter((t) => t.status === 'rejected').length;

  return (
    <div className="card-levitate overflow-hidden rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm dark:border-gray-700/40 dark:bg-gray-900/50">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          ⏳ {t('ui.home.tasksAwaitingReview', { defaultValue: 'Tasks Awaiting Review' })}
          <span className="ml-2 text-sm font-normal text-gray-600 dark:text-gray-400">
            ({pendingCount} {t('ui.pending', { defaultValue: 'pending' })}
            {rejectedCount > 0 && (
              <>
                , {rejectedCount} {t('ui.rejected', { defaultValue: 'rejected' })}
              </>
            )}
            )
          </span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all' as const, label: t('ui.all', { defaultValue: 'All' }) },
            {
              key: 'Knowledge' as const,
              label: t('ui.category.knowledge', { defaultValue: 'Knowledge' }) || 'Knowledge',
            },
            {
              key: 'Skills' as const,
              label: t('ui.category.skills', { defaultValue: 'Skills' }) || 'Skills',
            },
            {
              key: 'Guidance' as const,
              label: t('ui.category.guidance', { defaultValue: 'Guidance' }) || 'Guidance',
            },
          ].map((option) => {
            const isActive = categoryFilter === option.key;
            const variant = isActive
              ? CATEGORY_ACCENTS[option.key].active
              : CATEGORY_ACCENTS[option.key].inactive;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => setCategoryFilter(option.key)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-600 dark:focus-visible:ring-offset-gray-900 ${variant}`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
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
        <div className="space-y-2">
          {list.map((task) => {
            const priorityConfig = getPriorityConfig(task.priority);
            return (
              <div
                key={task.status === 'pending' ? `${task.itemId}__${task.rotationId}` : task.id}
                className={`group relative overflow-hidden rounded-lg border ${priorityConfig.border} ${priorityConfig.bg} p-3 transition-all hover:shadow-md`}
              >
                {/* Priority indicator bar */}
                <div className={`absolute left-0 top-0 h-full w-1 ${priorityConfig.indicator}`} />

                <div className="flex items-center justify-between gap-3 pl-2">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {/* Priority icon */}
                    <span className="text-lg">{priorityConfig.icon}</span>

                    {/* Task info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {nodesById[task.itemId]?.name || task.itemId}
                        </span>
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
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <span className="capitalize">{task.status}</span>
                        {task.status === 'rejected' && (
                          <span className="font-medium text-red-600 dark:text-red-400">
                            • {t('ui.home.needsAttention', { defaultValue: 'Needs attention' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action button */}
                  <Link
                    href={`/resident/reflections/${task.latestTaskId}?taskType=${encodeURIComponent(nodesById[task.itemId]?.name || 'Task')}`}
                  >
                    <Button
                      size="sm"
                      variant="outline"
                      className={
                        task.status === 'rejected'
                          ? 'border-red-400 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30'
                          : ''
                      }
                    >
                      {task.status === 'rejected'
                        ? t('ui.home.review', { defaultValue: 'Review' })
                        : t('ui.home.reflect', { defaultValue: 'Reflect' })}
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
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
