'use client';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../../lib/firebase/client';
import type { TaskDoc } from '../../../lib/firebase/db';
import { logger } from '../../../lib/utils/logger';
import type { UserProfile } from '../../../types/auth';
import type { RotationNode } from '../../../types/rotations';
import Button from '../../ui/Button';

type Props = {
  residents: UserProfile[];
  tasks: TaskDoc[];
  onBulkApprove: (ids: string[]) => Promise<void>;
  onBulkReject: (ids: string[], reason?: string) => Promise<void>;
};

export default function TasksTab({ residents, tasks, onBulkApprove, onBulkReject }: Props) {
  const { i18n } = useTranslation();
  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const groups = useMemo(() => {
    const map = new Map<string, TaskDoc[]>();
    for (const t of tasks) {
      const arr = map.get(t.userId) || [];
      arr.push(t);
      map.set(t.userId, arr);
    }
    return map;
  }, [tasks]);
  const [nodesById, setNodesById] = useState<Record<string, RotationNode>>({});
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [reason, setReason] = useState('');

  const rotationIds = useMemo(
    () => Array.from(new Set(tasks.map((task) => task.rotationId))),
    [tasks],
  );

  useEffect(() => {
    if (!rotationIds.length) {
      setNodesById({});
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const db = getFirestore(getFirebaseApp());
        const snapshots = await Promise.all(
          rotationIds.map((rotationId) =>
            getDocs(query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId))),
          ),
        );
        if (cancelled) return;
        const map: Record<string, RotationNode> = {};
        snapshots.forEach((snap) => {
          snap.docs.forEach((doc) => {
            const data = doc.data() as RotationNode;
            map[doc.id] = { ...data, id: doc.id };
          });
        });
        setNodesById(map);
      } catch (error) {
        if (!cancelled) {
          logger.error(
            'Failed to load rotation nodes for tutor tasks',
            'tutor-tasks-tab',
            error as Error,
          );
          setNodesById({});
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rotationIds]);

  const selectedIds = useMemo(() => Object.keys(sel).filter((k) => sel[k]), [sel]);
  const language = (i18n?.language || 'en').split('-')[0] ?? 'en';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm opacity-70 text-gray-600 dark:text-gray-300">
          Selected: {selectedIds.length}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="rounded border px-2 py-1 text-sm bg-white dark:bg-[rgb(var(--surface-depressed))] text-gray-900 dark:text-gray-50 border-gray-300 dark:border-[rgb(var(--border))] placeholder:text-gray-500 dark:placeholder:text-gray-400"
            placeholder="Optional rejection reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button onClick={() => onBulkApprove(selectedIds)} disabled={selectedIds.length === 0}>
            Approve
          </Button>
          <Button
            variant="secondary"
            onClick={() => onBulkReject(selectedIds, reason)}
            disabled={selectedIds.length === 0}
          >
            Reject
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from(groups.entries()).map(([uid, list]) => {
          const r = resById.get(uid);
          return (
            <div key={uid} className="card-levitate p-3">
              <div className="font-semibold mb-2 text-gray-900 dark:text-gray-50">
                {(r && r.fullName) || uid}
              </div>
              <div className="space-y-2">
                {list.map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center justify-between text-sm border border-gray-200 dark:border-[rgb(var(--border))] rounded px-2 py-1 hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] transition"
                  >
                    <div>
                      <div className="font-medium text-gray-900 dark:text-gray-50">
                        {getNodeDisplayName(nodesById[t.itemId], language) || t.itemId}{' '}
                        <span className="opacity-70 text-gray-600 dark:text-gray-300">
                          ({t.count}/{t.requiredCount})
                        </span>
                      </div>
                      <div className="text-xs opacity-70 text-gray-600 dark:text-gray-300">
                        Rotation: {t.rotationId}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={!!sel[t.id]}
                      onChange={(e) => setSel((s) => ({ ...s, [t.id]: e.target.checked }))}
                    />
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getNodeDisplayName(node: RotationNode | undefined, language: string) {
  if (!node) return '';
  const normalized = language?.toLowerCase?.() ?? 'en';
  if (normalized.startsWith('he') && node.name_he) return node.name_he;
  if (normalized.startsWith('en') && node.name_en) return node.name_en;
  return node.name || node.name_en || node.name_he || '';
}
