'use client';
import {
  onSnapshot,
  query,
  collection,
  where,
  getFirestore,
  orderBy,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

type MorningMeeting = {
  id: string;
  date: string;
  lecturerId?: string;
  lecturerName?: string;
  topic?: string;
  [key: string]: any;
};

export function useUpcomingMeetings(days: number = 7) {
  const [meetings, setMeetings] = useState<MorningMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());

    // Calculate date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + days);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const qRef = query(
      collection(db, 'morningMeetings'),
      where('date', '>=', todayStr),
      where('date', '<=', futureDateStr),
      orderBy('date', 'asc'),
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const meetingsData = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as MorningMeeting[];
        setMeetings(meetingsData);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to get upcoming meetings');
        setLoading(false);
      },
    );

    return () => unsub();
  }, [days]);

  return { meetings, count: meetings.length, loading, error } as const;
}
