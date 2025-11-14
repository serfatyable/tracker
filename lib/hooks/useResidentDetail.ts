'use client';

import { useCallback, useEffect, useState } from 'react';

import type { RotationPetition } from '../../types/rotationPetitions';
import { fetchUserTasks, type TaskDoc, getResidentPetitions } from '../firebase/db';

export type ResidentDetailState = {
  tasks: TaskDoc[];
  petitions: RotationPetition[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useResidentDetail(residentId: string | null): ResidentDetailState {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [petitions, setPetitions] = useState<RotationPetition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setTasks([]);
    setPetitions([]);
  }, [residentId]);

  const refresh = useCallback(async () => {
    if (!residentId) {
      setTasks([]);
      setPetitions([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [tasksList, petitionList] = await Promise.all([
        fetchUserTasks(residentId),
        getResidentPetitions(residentId),
      ]);
      setTasks(tasksList);
      setPetitions(petitionList);
    } catch (e: any) {
      setError(e?.message || 'Failed to load resident detail');
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    refresh().catch(() => {
      // Errors are reflected in state; ignore unhandled rejection.
    });
  }, [refresh]);

  return { tasks, petitions, loading, error, refresh } as const;
}
