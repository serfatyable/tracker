'use client';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { OnCallDay } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';

export function useOnCallByDate(dateKey: string) {
  const [data, setData] = useState<OnCallDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dateKey) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const snap = await getDoc(doc(db, 'onCallDays', dateKey));
        if (!cancelled) {
          setData(snap.exists() ? ({ id: dateKey, ...(snap.data() as any) } as OnCallDay) : null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load on-call by date');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dateKey]);

  return { data, loading, error } as const;
}
