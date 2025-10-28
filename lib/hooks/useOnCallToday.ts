'use client';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { OnCallDay } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';
import { withTimeoutAndRetry, getNetworkErrorMessage } from '../utils/networkUtils';

export function useOnCallToday(dateKey?: string) {
  const [data, setData] = useState<OnCallDay | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await withTimeoutAndRetry(
          async () => {
            const db = getFirestore(getFirebaseApp());
            const now = new Date();
            // Compute today based on Asia/Jerusalem calendar day
            const tz = 'Asia/Jerusalem';
            const fmt = new Intl.DateTimeFormat('en-CA', {
              timeZone: tz,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
            });
            const key = dateKey || fmt.format(now);
            const snap = await getDoc(doc(db, 'onCallDays', key));
            return snap.exists() ? ({ id: key, ...(snap.data() as any) } as OnCallDay) : null;
          },
          {
            timeout: 10000, // 10 seconds for single document
            retries: 3,
            operationName: 'load on-call today',
          },
        );

        if (!cancelled) {
          setData(result);
        }
      } catch (e: any) {
        if (!cancelled) {
          const userMessage = getNetworkErrorMessage(e, 'Failed to load on-call schedule');
          setError(userMessage);
        }
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
