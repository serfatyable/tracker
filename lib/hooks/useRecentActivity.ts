'use client';
import {
  onSnapshot,
  query,
  collection,
  orderBy,
  limit,
  where,
  getFirestore,
  Timestamp,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

export type AuditLogEntry = {
  id: string;
  timestamp: Timestamp;
  action: string;
  userId?: string;
  userName?: string;
  details?: string;
  [key: string]: any;
};

export function useRecentActivity(limitCount: number = 10, hoursAgo: number = 24) {
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());

    // Calculate timestamp for X hours ago
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursAgo);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const qRef = query(
      collection(db, 'auditLog'),
      where('timestamp', '>=', cutoffTimestamp),
      orderBy('timestamp', 'desc'),
      limit(limitCount),
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const logs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as AuditLogEntry[];
        setActivities(logs);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to get recent activity');
        setLoading(false);
      },
    );

    return () => unsub();
  }, [limitCount, hoursAgo]);

  return { activities, count: activities.length, loading, error } as const;
}
