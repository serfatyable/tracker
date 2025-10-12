'use client';
import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import type { OnCallDay } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';

export function useOnCallToday(dateKey?: string) {
  const [data, setData] = useState<OnCallDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const now = new Date();
        const key = dateKey || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
        const snap = await getDoc(doc(db, 'onCallDays', key));
        setData(snap.exists() ? ({ id: key, ...(snap.data() as any) } as OnCallDay) : null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load on-call today');
      } finally {
        setLoading(false);
      }
    })();
  }, [dateKey]);

  return { data, loading, error } as const;
}


