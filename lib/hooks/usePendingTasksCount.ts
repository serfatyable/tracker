'use client';
import { onSnapshot, query, collection, where, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

export function usePendingTasksCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const qRef = query(collection(db, 'tasks'), where('status', '==', 'pending'));

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setCount(snap.size);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to get pending tasks count');
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  return { count, loading, error } as const;
}
