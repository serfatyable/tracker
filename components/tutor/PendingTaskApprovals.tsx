'use client';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

import { updateTasksStatus } from '../../lib/firebase/admin';
import { getFirebaseApp } from '../../lib/firebase/client';
import type { TaskDoc } from '../../lib/firebase/db';
import type { UserProfile } from '../../types/auth';
import type { Rotation, RotationNode } from '../../types/rotations';
import Button from '../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../ui/Dialog';

type Props = {
  tasks: TaskDoc[];
  residents: UserProfile[];
  rotations: Rotation[];
};

export default function PendingTaskApprovals({ tasks, residents, rotations }: Props) {
  const { t, i18n } = useTranslation();
  const [confirm, setConfirm] = useState<{ id: string; action: 'approve' | 'deny' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rotationNodes, setRotationNodes] = useState<RotationNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);

  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const rotById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);
  const nodeById = useMemo(
    () => new Map(rotationNodes.map((n) => [n.id, n])),
    [rotationNodes],
  );

  // Fetch rotation nodes for all rotations that have tasks
  useEffect(() => {
    const uniqueRotationIds = [...new Set(tasks.map((t) => t.rotationId))];
    if (uniqueRotationIds.length === 0) {
      setRotationNodes([]);
      return;
    }

    (async () => {
      try {
        setLoadingNodes(true);
        const db = getFirestore(getFirebaseApp());
        const allNodes: RotationNode[] = [];

        for (const rotationId of uniqueRotationIds) {
          const snap = await getDocs(
            query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId)),
          );
          const nodes = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          })) as RotationNode[];
          allNodes.push(...nodes);
        }

        setRotationNodes(allNodes);
      } catch (e) {
        console.error('Failed to load rotation nodes:', e);
      } finally {
        setLoadingNodes(false);
      }
    })();
  }, [tasks]);

  const onConfirm = async () => {
    if (!confirm) return;
    setBusyId(confirm.id);
    try {
      await updateTasksStatus({
        taskIds: [confirm.id],
        status: confirm.action === 'approve' ? 'approved' : 'rejected',
      });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  if (!tasks.length) return null;

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('tutor.pendingTaskApprovals')}</div>
      {loadingNodes ? (
        <div className="text-sm opacity-70 text-gray-600 dark:text-gray-300">
          {t('ui.loading', { defaultValue: 'Loading...' })}
        </div>
      ) : null}
      <div className="space-y-2">
        {tasks.map((task) => {
          const resident = resById.get(task.userId);
          const rotation = rotById.get(task.rotationId);
          const node = nodeById.get(task.itemId);

          // Get localized task name
          const taskName = node
            ? i18n.language === 'he' && node.name_he
              ? node.name_he
              : node.name_en || node.name
            : task.itemId;

          // Get localized rotation name
          const rotationName = rotation
            ? i18n.language === 'he' && rotation.name_he
              ? rotation.name_he
              : rotation.name_en || rotation.name
            : task.rotationId;

          return (
            <div
              key={task.id}
              className="border rounded p-2 flex items-center justify-between text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{resident?.fullName || task.userId}</span>
                <span className="text-xs opacity-70">
                  {taskName} ({task.count}/{task.requiredCount})
                </span>
                <span className="text-xs opacity-70">{rotationName}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                  variant="outline"
                  disabled={busyId === task.id}
                  onClick={() => setConfirm({ id: task.id, action: 'approve' })}
                >
                  {t('tutor.approve')}
                </Button>
                <Button
                  size="sm"
                  className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                  variant="outline"
                  disabled={busyId === task.id}
                  onClick={() => setConfirm({ id: task.id, action: 'deny' })}
                >
                  {t('tutor.deny')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <div className="p-3 space-y-2">
          <DialogHeader>
            {confirm?.action === 'approve'
              ? t('tutor.approveTask', { defaultValue: 'Approve task' })
              : t('tutor.denyTask', { defaultValue: 'Deny task' })}
          </DialogHeader>
          <div className="text-sm">
            {t('ui.areYouSure', { defaultValue: 'Are you sure?' })}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('ui.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={onConfirm} disabled={!confirm || busyId === confirm?.id}>
              {t('ui.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
