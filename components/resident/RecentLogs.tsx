'use client';
import { getAuth } from 'firebase/auth';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocalized } from '../../lib/i18n/getLocalized';

import { getFirebaseApp } from '../../lib/firebase/client';
import { listRecentTasksForUser, type TaskDoc } from '../../lib/firebase/db';
import { ListSkeleton } from '../dashboard/Skeleton';
import EmptyState, { DocumentIcon } from '../ui/EmptyState';
import { ErrorWithRetry } from '../ui/RetryButton';

export default function RecentLogs({ itemIdsToNames }: { itemIdsToNames: Record<string, string> }) {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      setLoading(true);
      const recent = await listRecentTasksForUser({ userId: uid, limit: 5 });
      setLogs(recent);
    } catch (err: any) {
      console.error('Failed to load recent logs:', err);
      setError(
        t('ui.failedToLoadLogs', { defaultValue: 'Failed to load recent logs' }) ||
          'Failed to load logs',
      );
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleRetry = () => {
    return loadLogs();
  };
  return (
    <div className="card-levitate rounded border p-3 border-sky-200/60 dark:border-sky-900/40">
      <div className="text-sm font-medium mb-2">{t('ui.recentLogs') || 'Recent logs'}</div>
      {loading ? (
        <ListSkeleton items={3} />
      ) : error ? (
        <ErrorWithRetry
          title={t('ui.errorLoadingLogs', { defaultValue: 'Error loading logs' })}
          message={error}
          onRetry={handleRetry}
          retryLabel={t('ui.tryAgain', { defaultValue: 'Try Again' })}
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon size={40} />}
          title={t('ui.noRecentLogs') || 'No recent logs'}
          description={t('ui.logsAppearHere', {
            defaultValue: 'Your logged activities will appear here.',
          })}
          className="py-6"
        />
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {logs.map((l) => (
            <li
              key={l.id}
              className="flex items-center justify-between rounded border border-gray-200 px-2 py-1 dark:border-[rgb(var(--border))]"
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
