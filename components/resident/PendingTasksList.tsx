'use client';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { ListSkeleton } from '../dashboard/Skeleton';
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
    const base = tasks.filter((t) => t.status === 'pending' || t.status === 'rejected');
    const byRotation =
      rotationFilter === 'active' && activeRotationId
        ? base.filter((t) => t.rotationId === activeRotationId)
        : base;
    const filtered =
      categoryFilter === 'all'
        ? byRotation
        : byRotation.filter((t) => {
            const node = nodesById[t.itemId];
            // walk up via nodesById to find category name
            return node && findCategoryName(nodesById, t.itemId) === categoryFilter;
          });
    return filtered;
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
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-[rgb(var(--border))]"
            >
              <span>{nodesById[t.itemId]?.name || t.itemId}</span>
              <span className="flex items-center gap-2">
                <span className="text-gray-500">{t.status}</span>
                <Link
                  href={`/resident/reflections/${t.id}?taskType=${encodeURIComponent(nodesById[t.itemId]?.name || 'Task')}`}
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
