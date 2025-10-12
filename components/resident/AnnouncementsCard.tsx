'use client';
import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { getFirebaseApp } from '../../lib/firebase/client';
import { useTranslation } from 'react-i18next';

type Ann = { id: string; title: string; body: string; published: boolean; roles: string[] };

export default function AnnouncementsCard() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(
          query(collection(db, 'announcements'), where('published', '==', true)),
        );
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as any);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return (
    <div
      className="card-levitate rounded border p-3 border-purple-200/60 dark:border-purple-900/40"
      style={{ boxShadow: '0 8px 24px rgba(139,92,246,0.16)' }}
    >
      <div className="text-sm font-medium">{t('ui.announcements') || 'Announcements'}</div>
      {loading ? (
        <div className="text-sm text-gray-500">{t('ui.loadingItems')}</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">{t('ui.none') || 'None'}</div>
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
