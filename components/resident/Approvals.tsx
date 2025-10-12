'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import Select from '../ui/Select';
import Button from '../ui/Button';

export default function Approvals({
  onOpenRotation,
}: {
  onOpenRotation?: (rotationId: string, itemId?: string) => void;
}) {
  const { t } = useTranslation();
  const { tasks } = useUserTasks();
  const { rotationId } = useResidentActiveRotation();
  const { byId } = useRotationNodes(rotationId || null);
  const [status, setStatus] = useState<'all' | 'pending' | 'rejected'>('all');
  const [category, setCategory] = useState<'all' | 'Knowledge' | 'Skills' | 'Guidance'>('all');

  const filtered = useMemo(() => {
    let list = tasks.filter((t) => t.status === 'pending' || t.status === 'rejected');
    if (status !== 'all') list = list.filter((t) => t.status === status);
    if (category !== 'all') list = list.filter((t) => categoryOf(byId, t.itemId) === category);
    return list;
  }, [tasks, status, category, byId]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="all">{t('ui.all') || 'All'}</option>
          <option value="pending">{t('ui.pending') || 'Pending'}</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Select
          aria-label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as any)}
        >
          <option value="all">knowledge/skills/guidance</option>
          <option value="Knowledge">{t('ui.category.knowledge') || 'knowledge'}</option>
          <option value="Skills">{t('ui.category.skills') || 'skills'}</option>
          <option value="Guidance">{t('ui.category.guidance') || 'guidance'}</option>
        </Select>
      </div>
      {filtered.length === 0 ? (
        <div className="text-sm text-gray-500">{t('ui.noItems') || 'No items'}</div>
      ) : (
        <ul className="space-y-1 text-sm">
          {filtered.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-gray-800"
            >
              <span>{byId[task.itemId]?.name || task.itemId}</span>
              <span className="flex items-center gap-2">
                <span className="text-gray-500">{task.status}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenRotation && onOpenRotation(task.rotationId, task.itemId)}
                >
                  {t('ui.open') || 'Open'}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function categoryOf(
  byId: Record<string, any>,
  id: string,
): 'Knowledge' | 'Skills' | 'Guidance' | 'all' | null {
  let cur = byId[id];
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    if (cur.type === 'category') return cur.name;
    cur = cur.parentId ? byId[cur.parentId] : null;
  }
  return null;
}
