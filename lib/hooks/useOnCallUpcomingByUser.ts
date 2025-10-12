'use client';
import { useEffect, useState } from 'react';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import type { OnCallAssignment } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';

export function useOnCallUpcomingByUser(userId?: string) {
  const [data, setData] = useState<OnCallAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const col = collection(db, 'onCallAssignments');
        const now = new Date();
        const q = query(col, where('userId', '==', userId), where('endAt', '>=', now), orderBy('userId'), orderBy('startAt'));
        const snap = await getDocs(q);
        setData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as OnCallAssignment)));
      } catch (e: any) {
        setError(e?.message || 'Failed to load upcoming on-call');
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const next = data.length ? data[0] : null;
  return { data, next, loading, error } as const;
}


