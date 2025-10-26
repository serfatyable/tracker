'use client';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  limit as qLimit,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { OnCallAssignment } from '../../types/onCall';
import { getFirebaseApp } from '../firebase/client';

// Finds the next on-call shift for a user by scanning upcoming onCallDays for a matching uid
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

        // Query next ~90 days of onCallDays ordered by dateKey
        const today = new Date();
        const startKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(
          today.getDate(),
        ).padStart(2, '0')}`;

        const daysSnap = await getDocs(
          query(
            collection(db, 'onCallDays'),
            where('dateKey', '>=', startKey),
            orderBy('dateKey', 'asc'),
            qLimit(120),
          ),
        );

        // Find the earliest station matching this userId
        let found: null | (OnCallAssignment & { stationKey: string }) = null;
        for (const d of daysSnap.docs) {
          const rec = d.data() as any;
          const stations = (rec.stations || {}) as Record<
            string,
            { userId: string; userDisplayName: string }
          >;
          for (const [stationKey, entry] of Object.entries(stations)) {
            if (entry && entry.userId === userId) {
              // Synthesize minimal assignment-like object for UI
              const parts = String(rec.dateKey)
                .split('-')
                .map((p: string) => parseInt(p, 10));
              const start = new Date(
                parts[0] as number,
                (parts[1] as number) - 1,
                parts[2] as number,
              );
              found = {
                id: `${rec.dateKey}_${stationKey}_${userId}`,
                dateKey: rec.dateKey,
                stationKey: stationKey as any,
                userId,
                userDisplayName: entry.userDisplayName,
                startAt: start as any,
                endAt: start as any,
              } as any;
              break;
            }
          }
          if (found) break;
        }

        if (!cancelled) {
          setData(found ? [found as any] : []);
          setError(null);
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
