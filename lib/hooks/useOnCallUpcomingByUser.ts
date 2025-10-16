'use client';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { OnCallAssignment } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';

export function useOnCallUpcomingByUser(userId?: string) {
  const [data, setData] = useState<OnCallAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const col = collection(db, 'onCallAssignments');
        const now = new Date();
        const q = query(
          col,
          where('userId', '==', userId),
          where('endAt', '>=', now),
          orderBy('userId'),
          orderBy('startAt'),
        );
        const snap = await getDocs(q);
        if (!cancelled) {
          setData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }) as OnCallAssignment));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load upcoming on-call');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const next = data.length ? data[0] : null;
  return { data, next, loading, error } as const;
}
