/**
 * Enhanced task creation with automatic tutorIds sync
 *
 * These functions wrap the standard task operations and automatically
 * include tutorIds from the resident's active assignment.
 */

import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';

import { getFirebaseApp } from './client';

/**
 * Get the current tutorIds for a resident from their active assignment
 */
async function getCurrentTutorIds(residentId: string): Promise<string[]> {
  const db = getFirestore(getFirebaseApp());

  const assignmentsQuery = query(
    collection(db, 'assignments'),
    where('residentId', '==', residentId),
    where('endedAt', '==', null),
  );

  const assignmentsSnap = await getDocs(assignmentsQuery);

  if (assignmentsSnap.empty) {
    return [];
  }

  const assignment = assignmentsSnap.docs[0]?.data() as any;
  return assignment.tutorIds || [];
}

/**
 * Create a task with automatic tutorIds inclusion
 *
 * USE THIS instead of the standard createTask function
 * It automatically fetches and includes tutorIds from the resident's assignment
 */
export async function createTaskWithTutorIds(params: {
  userId: string;
  rotationId: string;
  itemId: string;
  count: number;
  requiredCount: number;
  note?: string;
}): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());

  // Fetch current tutorIds for this resident
  const tutorIds = await getCurrentTutorIds(params.userId);

  // Create task with tutorIds included
  const ref = await addDoc(collection(db, 'tasks'), {
    userId: params.userId,
    rotationId: params.rotationId,
    itemId: params.itemId,
    count: params.count,
    requiredCount: params.requiredCount,
    status: 'pending',
    note: params.note || null,
    tutorIds: tutorIds, // ✅ AUTHORIZATION: Include tutorIds for Firestore rules
    createdAt: serverTimestamp(),
  } as any);

  return { id: ref.id };
}

/**
 * Hook to use in React components - creates tasks with proper authorization data
 */
export function useCreateTaskWithAuth() {
  return {
    createTask: createTaskWithTutorIds,
  };
}
