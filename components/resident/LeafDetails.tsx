'use client';
import { useEffect, useMemo, useState } from 'react';
import type { RotationNode } from '../../types/rotations';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask, listRecentTasksByLeaf } from '../../lib/firebase/db';
import { useTranslation } from 'react-i18next';
import Toast from '../ui/Toast';

type Props = { leaf: RotationNode | null; canLog: boolean };

export default function LeafDetails({ leaf, canLog }: Props) {
  const { t } = useTranslation();
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [recent, setRecent] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!leaf) {
        setRecent([]);
        return;
      }
      const auth = getAuth(getFirebaseApp());
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      setLoadingRecent(true);
      try {
        const list = await listRecentTasksByLeaf({ userId: uid, itemId: leaf.id, limit: 5 });
        setRecent(list);
      } finally {
        setLoadingRecent(false);
      }
    })();
  }, [leaf && leaf.id]);

  const required = leaf?.requiredCount || 0;
  const progress = useMemo(() => {
    let approved = 0;
    let pending = 0;
    for (const t of recent) {
      if (t.status === 'approved') approved += t.count || 0;
      else if (t.status === 'pending') pending += t.count || 0;
    }
    return { approved, pending };
  }, [recent]);

  if (!leaf)
    return (
      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 text-sm text-gray-500">
        {t('ui.selectLeaf')}
      </div>
    );

  async function handleLog() {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    if (!leaf) return;
    setSaving(true);
    try {
      await createTask({
        userId: uid,
        rotationId: leaf.rotationId,
        itemId: leaf.id,
        count: count || 1,
        requiredCount: required,
        note: note || undefined,
      });
      setToast(t('ui.logSuccess') || 'Logged +1');
      setNote('');
      setCount(1);
      const list = await listRecentTasksByLeaf({ userId: uid, itemId: leaf.id, limit: 5 });
      setRecent(list);
    } catch (e: any) {
      setToast(t('ui.logError') || 'Failed to log');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-gray-200 dark:border-gray-800 p-4 space-y-4">
      <div className="text-lg font-medium">{leaf.name}</div>
      <div className="space-y-2">
        <div className="text-sm text-gray-600">
          {t('ui.required')}: {required}
        </div>
        <ProgressBar approved={progress.approved} pending={progress.pending} required={required} />
      </div>
      {leaf.mcqUrl ? (
        <div className="text-sm">
          <a
            className="text-teal-700 underline"
            href={leaf.mcqUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t('ui.mcq')}
          </a>
        </div>
      ) : null}
      {(leaf.links || []).length ? (
        <div className="space-y-1">
          {(leaf.links || []).map((lnk, i) => (
            <div key={i} className="text-sm">
              <a
                className="text-teal-700 underline"
                href={lnk.href}
                target="_blank"
                rel="noreferrer"
              >
                {lnk.label || lnk.href}
              </a>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Input
          type="number"
          aria-label="Count"
          value={String(count)}
          onChange={(e) => setCount(Number(e.target.value || 1))}
        />
        <Input
          placeholder={t('ui.optionalNote') as string}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="sm:col-span-2"
        />
      </div>
      <div>
        <Button onClick={handleLog} disabled={!canLog || saving}>
          {saving ? t('ui.saving') || 'Saving...' : t('ui.logPlusOne')}
        </Button>
        {!canLog ? (
          <span
            className="ml-2 text-sm text-gray-500"
            title={t('ui.loggingOnlyInActiveRotation') as string}
          >
            {t('ui.disabled')}
          </span>
        ) : null}
      </div>
      <div className="space-y-1">
        <div className="text-sm font-medium">{t('ui.recentLogs') || 'Recent logs'}</div>
        {loadingRecent ? (
          <div className="text-sm text-gray-500">{t('ui.loadingItems')}</div>
        ) : recent.length === 0 ? (
          <div className="text-sm text-gray-500">{t('ui.noRecentLogs') || 'No recent logs'}</div>
        ) : (
          <div className="text-sm">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-1">
                <span>
                  {t.count} · {t.status}
                  {t.note ? ` · ${t.note}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <Toast message={toast} onClear={() => setToast(null)} />
    </div>
  );
}

function ProgressBar({
  approved,
  pending,
  required,
}: {
  approved: number;
  pending: number;
  required: number;
}) {
  const total = Math.max(required, approved + pending);
  const aPct = total ? Math.round((approved / total) * 100) : 0;
  const pPct = total ? Math.round((pending / total) * 100) : 0;
  return (
    <div className="h-3 w-full rounded bg-gray-100 dark:bg-gray-800 overflow-hidden flex">
      <div className="bg-green-500" style={{ width: `${aPct}%` }} />
      <div className="bg-amber-400" style={{ width: `${pPct}%` }} />
    </div>
  );
}
