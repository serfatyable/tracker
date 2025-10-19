'use client';
import { collection, query, where, orderBy, getDocs, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

export type OnCallShiftDay = {
  id: string;
  date: Date;
  dateKey: string;
  dayOfWeek?: string;
  shifts: Record<string, string>; // shiftType -> residentName
};

export function useOnCallSchedule(startDate: Date, endDate: Date) {
  const [schedule, setSchedule] = useState<OnCallShiftDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());

        const startKey = formatDateKey(startDate);
        const endKey = formatDateKey(endDate);

        const q = query(
          collection(db, 'onCallShifts'),
          where('dateKey', '>=', startKey),
          where('dateKey', '<=', endKey),
          orderBy('dateKey', 'asc'),
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          date: doc.data().date.toDate(),
          dateKey: doc.data().dateKey,
          dayOfWeek: doc.data().dayOfWeek,
          shifts: doc.data().shifts || {},
        }));

        setSchedule(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch on-call schedule:', err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [startDate, endDate]);

  return { schedule, loading, error };
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
