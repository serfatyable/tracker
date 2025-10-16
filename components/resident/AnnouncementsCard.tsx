'use client';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { ListSkeleton } from '../dashboard/Skeleton';
import EmptyState, { EmptyIcon } from '../ui/EmptyState';

type Ann = { id: string; title: string; body: string; published: boolean; roles: string[] };

export default function AnnouncementsCard() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(
          query(collection(db, 'announcements'), where('published', '==', true)),
        );
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
      } catch (err: any) {
        console.error('Failed to load announcements:', err);
        setError(
          t('ui.failedToLoadAnnouncements', { defaultValue: 'Failed to load announcements' }) ||
            'Failed to load announcements',
        );
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [t]);
  return (
    <div
      className="card-levitate rounded border p-3 border-purple-200/60 dark:border-purple-900/40"
      style={{ boxShadow: '0 8px 24px rgba(139,92,246,0.16)' }}
    >
      <div className="text-sm font-medium mb-2">{t('ui.announcements') || 'Announcements'}</div>
      {loading ? (
        <ListSkeleton items={2} />
      ) : error ? (
        <EmptyState
          icon={<EmptyIcon size={40} />}
          title={t('ui.errorLoadingAnnouncements', { defaultValue: 'Error loading announcements' })}
          description={error}
          className="py-6 text-red-600 dark:text-red-400"
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<EmptyIcon size={40} />}
          title={t('ui.noAnnouncements', { defaultValue: 'No announcements' })}
          description={t('ui.checkBackLater', { defaultValue: 'Check back later for updates.' })}
          className="py-6"
        />
      ) : (
        <ul className="mt-1 space-y-1 text-sm">
          {items.map((a) => (
            <li
              key={a.id}
              className="rounded border border-gray-200 px-2 py-1 dark:border-gray-800"
            >
              <div className="font-medium">{a.title}</div>
              <div className="text-gray-600 dark:text-gray-300">{a.body}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
