'use client';
import { collection, getDocs, getFirestore, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';
import { DEFAULT_DAYS_AHEAD } from '../on-call/constants';
import { getDateRange } from '../utils/dateUtils';
import { getNetworkErrorMessage, withTimeoutAndRetry } from '../utils/networkUtils';

import type { OnCallDay, OnCallShift, StationAssignment, StationKey } from '@/types/onCall';

export function useOnCallFutureByUser(userId?: string, daysAhead: number = DEFAULT_DAYS_AHEAD) {
  const [shifts, setShifts] = useState<OnCallShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { startKey, endKey } = useMemo(() => {
    return getDateRange(new Date(), daysAhead);
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
        setError(null);

        const nextShifts = await withTimeoutAndRetry(
          async () => {
            const db = getFirestore(getFirebaseApp());
            const snap = await getDocs(
              query(
                collection(db, 'onCallDays'),
                where('dateKey', '>=', startKey),
                where('dateKey', '<=', endKey),
                orderBy('dateKey', 'asc'),
              ),
            );

            const shifts: OnCallShift[] = [];
            for (const d of snap.docs) {
              const rec = d.data() as OnCallDay;
              const stations = rec.stations;
              for (const [stationKey, entry] of Object.entries(stations) as [
                StationKey,
                StationAssignment,
              ][]) {
                if (entry && entry.userId === userId) {
                  shifts.push({
                    date: rec.date?.toDate ? rec.date.toDate() : new Date(rec.date as any),
                    dateKey: rec.dateKey,
                    stationKey,
                    userDisplayName: entry.userDisplayName,
                    userId: entry.userId,
                  });
                }
              }
            }
            return shifts;
          },
          {
            timeout: 15000, // 15 seconds for query with multiple docs
            retries: 3,
            operationName: 'load user on-call shifts',
          },
        );

        if (!cancelled) {
          setShifts(nextShifts);
        }
      } catch (e: any) {
        if (!cancelled) {
          const userMessage = getNetworkErrorMessage(e, 'Failed to load user on-call shifts');
          setError(userMessage);
        }
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
