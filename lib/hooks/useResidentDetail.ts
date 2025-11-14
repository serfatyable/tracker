'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { RotationPetition } from '../../types/rotationPetitions';
import { listTasks } from '../firebase/admin';
import { fetchUserTasks, type TaskDoc, getResidentPetitions } from '../firebase/db';

import { useCurrentUserProfile } from './useCurrentUserProfile';

export type ResidentDetailState = {
  tasks: TaskDoc[];
  petitions: RotationPetition[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as any)?.code;
  if (typeof code === 'string' && code.includes('permission-denied')) return true;
  const message = (error as any)?.message;
  return typeof message === 'string' && message.toLowerCase().includes('permission');
}

async function loadTutorTasksForResident(residentId: string, tutorId: string): Promise<TaskDoc[]> {
  const aggregated: TaskDoc[] = [];
  let cursor: unknown;

  // Fetch up to 500 tasks in pages of 50 to cover long histories while
  // avoiding unbounded loops when a tutor supervises many residents.
  for (let page = 0; page < 10; page++) {
    const { items, lastCursor } = await listTasks({
      tutorId,
      limit: 50,
      startAfter: cursor,
    });

    if (!items.length && !lastCursor) break;

    for (const task of items) {
      if (task.userId === residentId) {
        aggregated.push(task);
      }
    }

    if (!lastCursor) break;
    cursor = lastCursor;
  }

  // Deduplicate by task id in case pagination ever returns overlapping pages.
  const unique = new Map<string, TaskDoc>();
  for (const task of aggregated) {
    unique.set(task.id, task);
  }
  return Array.from(unique.values());
}

export function useResidentDetail(residentId: string | null): ResidentDetailState {
  const { data: me } = useCurrentUserProfile();
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [petitions, setPetitions] = useState<RotationPetition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const viewer = useMemo(
    () => ({
      role: me?.role ?? null,
      uid: me?.uid ?? null,
    }),
    [me?.role, me?.uid],
  );

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

      if (!viewer.role && !viewer.uid) {
        setTasks([]);
        setPetitions([]);
        setLoading(false);
        return;
      }

      let tasksList: TaskDoc[] = [];

      const isTutor = viewer.role === 'tutor';
      const tutorId = viewer.uid;

      if (isTutor) {
        if (!tutorId) {
          setTasks([]);
          setPetitions([]);
          setLoading(false);
          return;
        }
        tasksList = await loadTutorTasksForResident(residentId, tutorId);
      } else {
        try {
          tasksList = await fetchUserTasks(residentId);
        } catch (err) {
          if (isPermissionDenied(err) && tutorId) {
            tasksList = await loadTutorTasksForResident(residentId, tutorId);
          } else {
            throw err;
          }
        }
      }

      const petitionList = await getResidentPetitions(residentId);

      setTasks(tasksList);
      setPetitions(petitionList);
    } catch (e: any) {
      setError(e?.message || 'Failed to load resident detail');
    } finally {
      setLoading(false);
    }
  }, [residentId, viewer]);

  useEffect(() => {
    refresh().catch(() => {
      // Errors are reflected in state; ignore unhandled rejection.
    });
  }, [refresh]);

  return { tasks, petitions, loading, error, refresh } as const;
}
