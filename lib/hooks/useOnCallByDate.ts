'use client';
import { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import type { OnCallDay } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';

export function useOnCallByDate(dateKey: string) {
  const [data, setData] = useState<OnCallDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateKey) return;
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const snap = await getDoc(doc(db, 'onCallDays', dateKey));
        setData(snap.exists() ? ({ id: dateKey, ...(snap.data() as any) } as OnCallDay) : null);
      } catch (e: any) {
        setError(e?.message || 'Failed to load on-call by date');
      } finally {
        setLoading(false);
      }
    })();
  }, [dateKey]);

  return { data, loading, error } as const;
}


