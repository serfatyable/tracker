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

import type { OnCallAssignment, OnCallDay, StationAssignment, StationKey } from '@/types/onCall';
import { getFirebaseApp } from '../firebase/client';
import { MAX_QUERY_DAYS } from '../on-call/constants';
import { toDateKey } from '../utils/dateUtils';
import { getNetworkErrorMessage, withTimeoutAndRetry } from '../utils/networkUtils';

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
        setError(null);

        const found = await withTimeoutAndRetry(
          async () => {
            const db = getFirestore(getFirebaseApp());

            // Query next ~90 days of onCallDays ordered by dateKey
            const startKey = toDateKey(new Date());

            const daysSnap = await getDocs(
              query(
                collection(db, 'onCallDays'),
                where('dateKey', '>=', startKey),
                orderBy('dateKey', 'asc'),
                qLimit(MAX_QUERY_DAYS),
              ),
            );

            // Find the earliest station matching this userId
            let foundAssignment: OnCallAssignment | null = null;
            for (const d of daysSnap.docs) {
              const rec = d.data() as OnCallDay;
              const stations = rec.stations;
              for (const [stationKey, entry] of Object.entries(stations) as [StationKey, StationAssignment][]) {
                if (entry && entry.userId === userId) {
                  // Synthesize minimal assignment-like object for UI
                  const parts = rec.dateKey.split('-').map((p: string) => parseInt(p, 10));
                  const start = new Date(
                    parts[0] as number,
                    (parts[1] as number) - 1,
                    parts[2] as number,
                  );
                  foundAssignment = {
                    id: `${rec.dateKey}_${stationKey}_${userId}`,
                    dateKey: rec.dateKey,
                    stationKey,
                    userId,
                    userDisplayName: entry.userDisplayName,
                    startAt: start as any, // Will be converted properly
                    endAt: start as any, // Will be converted properly
                  };
                  break;
                }
              }
              if (foundAssignment) break;
            }
            return foundAssignment;
          },
          {
            timeout: 15000, // 15 seconds for large query
            retries: 3,
            operationName: 'load upcoming on-call',
          },
        );

        if (!cancelled) {
          setData(found ? [found] : []);
        }
      } catch (e: any) {
        if (!cancelled) {
          const userMessage = getNetworkErrorMessage(e, 'Failed to load upcoming on-call');
          setError(userMessage);
        }
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
