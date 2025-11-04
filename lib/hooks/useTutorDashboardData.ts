'use client';
import { useEffect, useMemo, useState } from 'react';

import type { Assignment } from '../../types/assignments';
import type { RotationPetition } from '../../types/rotationPetitions';
import type { Rotation } from '../../types/rotations';
import { listRotationPetitions, listTasks } from '../firebase/admin';
import type { TaskDoc } from '../firebase/db';

import { useActiveAssignments } from './useActiveAssignments';
import { useActiveRotations } from './useActiveRotations';
import { useCurrentUserProfile } from './useCurrentUserProfile';
import { useUsersByRole } from './useUsersByRole';

export function useTutorDashboardData() {
  const { data: me } = useCurrentUserProfile();
  const { assignments } = useActiveAssignments();
  const { rotations } = useActiveRotations();
  const { residents, tutors } = useUsersByRole();

  const [petitions, setPetitions] = useState<RotationPetition[]>([]);
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ownedRotationIds = useMemo(() => {
    if (!me) return new Set<string>();
    const ids = (rotations || [])
      .filter((r: Rotation) => (r.ownerTutorIds || []).includes(me.uid))
      .map((r) => r.id);
    return new Set(ids);
  }, [rotations, me]);

  const supervisedResidentIds = useMemo(() => {
    if (!me) return new Set<string>();
    const ids = (assignments || [])
      .filter((a: Assignment) => (a.tutorIds || []).includes(me.uid))
      .map((a) => a.residentId);
    return new Set(ids);
  }, [assignments, me]);

  const supervisedResidents = useMemo(() => {
    const set = supervisedResidentIds;
    return residents.filter((r) => set.has(r.uid));
  }, [residents, supervisedResidentIds]);

  useEffect(() => {
    if (!me?.uid) {
      setPetitions([]);
      setTasks([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [petPage, taskPage] = await Promise.all([
          listRotationPetitions({ status: 'pending' }),
          listTasks({ status: 'pending', tutorId: me.uid }),
        ]);
        if (!cancelled) {
          setPetitions(petPage.items || []);
          setTasks(taskPage.items || []);
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || 'Failed to load');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [me?.uid]);

  const filteredPetitions = useMemo(() => {
    const set = supervisedResidentIds;
    return (petitions || []).filter((p) => set.has(p.residentId));
  }, [petitions, supervisedResidentIds]);

  const filteredTasks = useMemo(() => {
    const set = supervisedResidentIds;
    return (tasks || []).filter((t) => set.has(t.userId));
  }, [tasks, supervisedResidentIds]);

  return {
    me,
    assignments,
    rotations,
    residents,
    tutors,
    ownedRotationIds,
    supervisedResidents,
    petitions: filteredPetitions,
    tasks: filteredTasks,
    loading,
    error,
  } as const;
}
