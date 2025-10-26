'use client';
import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

export type MyShift = {
  date: Date;
  dateKey: string;
  stationKey: string;
  userDisplayName: string;
};

export function useOnCallFutureByUser(userId?: string, daysAhead: number = 40) {
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startKey, endKey } = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setDate(end.getDate() + Math.max(0, daysAhead));
    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { startKey: fmt(today), endKey: fmt(end) };
  }, [daysAhead]);

  useEffect(() => {
    if (!userId) {
      setShifts([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(
          query(
            collection(db, 'onCallDays'),
            where('dateKey', '>=', startKey),
            where('dateKey', '<=', endKey),
            orderBy('dateKey', 'asc'),
          ),
        );

        const nextShifts: MyShift[] = [];
        for (const d of snap.docs) {
          const rec = d.data() as any;
          const stations = (rec.stations || {}) as Record<
            string,
            { userId: string; userDisplayName: string }
          >;
          for (const [stationKey, entry] of Object.entries(stations)) {
            if (entry && entry.userId === userId) {
              nextShifts.push({
                date: rec.date?.toDate ? rec.date.toDate() : new Date(rec.date),
                dateKey: rec.dateKey,
                stationKey,
                userDisplayName: entry.userDisplayName,
              });
            }
          }
        }

        if (!cancelled) {
          setShifts(nextShifts);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load user on-call shifts');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, startKey, endKey]);

  return { shifts, loading, error } as const;
}
