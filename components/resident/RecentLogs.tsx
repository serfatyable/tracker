'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '../../lib/firebase/client';
import { listRecentTasksForUser, type TaskDoc } from '../../lib/firebase/db';
import { useTranslation } from 'react-i18next';

export default function RecentLogs({ itemIdsToNames }: { itemIdsToNames: Record<string, string> }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const auth = getAuth(getFirebaseApp());
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setLoading(false);
        return;
      }
      try {
        const recent = await listRecentTasksForUser({ userId: uid, limit: 5 });
        setLogs(recent);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return (
    <div className="card-levitate rounded border p-3 border-sky-200/60 dark:border-sky-900/40">
      <div className="text-sm font-medium">{t('ui.recentLogs') || 'Recent logs'}</div>
      {loading ? (
        <div className="text-sm text-gray-500">{t('ui.loadingItems')}</div>
      ) : logs.length === 0 ? (
        <div className="text-sm text-gray-500">{t('ui.noRecentLogs') || 'No recent logs'}</div>
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-gray-800"
            >
              <span>{itemIdsToNames[l.itemId] || l.itemId}</span>
              <span className="text-gray-500">{l.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
