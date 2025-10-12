'use client';
import { useEffect, useMemo, useState } from 'react';

import type { Assignment } from '../../types/assignments';
import type { Rotation } from '../../types/rotations';
import type { UserProfile } from '../../types/auth';
import type { RotationPetition } from '../../types/rotationPetitions';
import type { TaskDoc, TutorTodo } from '../firebase/db';
import { useCurrentUserProfile } from './useCurrentUserProfile';
import { useActiveAssignments } from './useActiveAssignments';
import { useActiveRotations } from './useActiveRotations';
import { useUsersByRole } from './useUsersByRole';
import { listRotationPetitions, listTasks } from '../firebase/admin';
import { listTutorTodosByUser } from '../firebase/db';

export function useTutorDashboardData() {
  const { data: me } = useCurrentUserProfile();
  const { assignments } = useActiveAssignments();
  const { rotations } = useActiveRotations();
  const { residents, tutors } = useUsersByRole();

  const [petitions, setPetitions] = useState<RotationPetition[]>([]);
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [todos, setTodos] = useState<TutorTodo[]>([]);
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
    (async () => {
      try {
        setLoading(true);
        const [petPage, taskPage] = await Promise.all([
          listRotationPetitions({ status: 'pending' }),
          listTasks({ status: 'pending' }),
        ]);
        setPetitions(petPage.items || []);
        setTasks(taskPage.items || []);
        if (me) {
          const myTodos = await listTutorTodosByUser(me.uid);
          setTodos(myTodos);
        } else {
          setTodos([]);
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
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
    todos,
    loading,
    error,
  } as const;
}
