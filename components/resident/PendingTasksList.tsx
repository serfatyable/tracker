'use client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import type { TaskDoc } from '../../lib/firebase/db';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Link from 'next/link';

export default function PendingTasksList({
  activeRotationId,
  nodesById,
}: {
  activeRotationId: string | null;
  nodesById: Record<string, { name: string; rotationId: string }>;
}) {
  const { t } = useTranslation();
  const { tasks } = useUserTasks();
  const [rotationFilter, setRotationFilter] = useState<'active' | 'all'>('active');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'Knowledge' | 'Skills' | 'Guidance'>(
    'all',
  );

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

  return (
    <div className="card-levitate rounded border p-3 border-amber-200/60 dark:border-amber-900/40">
      <div className="mb-2 flex items-center gap-2">
        <Select
          aria-label="Rotation filter"
          value={rotationFilter}
          onChange={(e) => setRotationFilter(e.target.value as any)}
        >
          <option value="active">all/active rotations</option>
          <option value="all">{t('ui.all') || 'All'}</option>
        </Select>
        <Select
          aria-label="Category filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as any)}
        >
          <option value="all">knowledge/skills/guidance</option>
          <option value="Knowledge">{t('ui.category.knowledge') || 'knowledge'}</option>
          <option value="Skills">{t('ui.category.skills') || 'skills'}</option>
          <option value="Guidance">{t('ui.category.guidance') || 'guidance'}</option>
        </Select>
      </div>
      {list.length === 0 ? (
        <div className="text-sm text-gray-500">{t('ui.noItems')}</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-gray-800"
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
