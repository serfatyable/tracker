'use client';
import { getAuth } from 'firebase/auth';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';
import { fetchUserTasks, type TaskDoc } from '../firebase/db';

export function useUserTasks() {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setTasks([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const list = await fetchUserTasks(uid);
        if (!cancelled) {
          setTasks(list);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load tasks');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { tasks, loading, error } as const;
}
