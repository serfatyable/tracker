'use client';
import { onSnapshot, doc, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

type OnCallSchedule = {
  date: string;
  residents?: Array<{ uid: string; name: string }>;
  tutors?: Array<{ uid: string; name: string }>;
  [key: string]: any;
};

export function useTodayOnCall() {
  const [schedule, setSchedule] = useState<OnCallSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());

    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateStr = today.toISOString().split('T')[0] as string;

    const docRef = doc(db, 'onCallSchedule', dateStr);

    const unsub = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          setSchedule({ date: dateStr, ...snap.data() } as OnCallSchedule);
        } else {
          setSchedule(null);
        }
        setLoading(false);
      },
      (e) => {
        setError(e?.message || "Failed to get today's on-call schedule");
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  return { schedule, loading, error } as const;
}
