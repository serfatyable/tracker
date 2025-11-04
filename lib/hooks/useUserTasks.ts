'use client';
import { getAuth } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';
import { fetchUserTasks, type TaskDoc } from '../firebase/db';

export function useUserTasks() {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) {
      if (!mountedRef.current) return [];
      setTasks([]);
      setLoading(false);
      return [];
    }
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    try {
      const list = await fetchUserTasks(uid);
      if (mountedRef.current) {
        setTasks(list);
      }
      return list;
    } catch (e: any) {
      if (mountedRef.current) {
        setError(e?.message || 'Failed to load tasks');
      }
      throw e;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => {
      // Errors are already captured in state; suppress unhandled rejection.
    });
  }, [refresh]);

  return { tasks, loading, error, refresh } as const;
}
