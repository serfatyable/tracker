import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  orderBy,
  limit as qLimit,
  serverTimestamp,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';

import type { UserProfile } from '../../types/auth';
import type { RotationPetition } from '../../types/rotationPetitions';

import { getFirebaseApp } from './client';

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirestore(getFirebaseApp());
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      return snap.exists() ? (snap.data() as UserProfile) : null;
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to load user profile');
}

export type TaskDoc = {
  id: string;
  userId: string;
  rotationId: string;
  itemId: string;
  count: number;
  requiredCount: number;
  status: 'pending' | 'approved' | 'rejected';
  feedback?: Array<{ by: string; text: string }>;
  note?: string;
  createdAt?: any;
};

export async function fetchUserTasks(uid: string): Promise<TaskDoc[]> {
  const db = getFirestore(getFirebaseApp());
  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const qRef = query(collection(db, 'tasks'), where('userId', '==', uid));
      const snap = await getDocs(qRef);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('Failed to load tasks');
}

export async function createTask(params: {
  userId: string;
  rotationId: string;
  itemId: string;
  count: number;
  requiredCount: number;
  note?: string;
}): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());

  // Fetch current tutorIds for authorization
  const tutorIds = await getCurrentTutorIdsForResident(params.userId);

  const ref = await addDoc(collection(db, 'tasks'), {
    userId: params.userId,
    rotationId: params.rotationId,
    itemId: params.itemId,
    count: params.count,
    requiredCount: params.requiredCount,
    status: 'pending',
    note: params.note || null,
    tutorIds: tutorIds, // ✅ AUTHORIZATION: Include for Firestore rules
    createdAt: serverTimestamp(),
  } as any);
  return { id: ref.id };
}

/**
 * Get tutorIds from resident's active assignment
 * Used to populate task.tutorIds for authorization rules
 */
async function getCurrentTutorIdsForResident(residentId: string): Promise<string[]> {
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

export async function listRecentTasksByLeaf(params: {
  userId: string;
  itemId: string;
  limit?: number;
}): Promise<TaskDoc[]> {
  const db = getFirestore(getFirebaseApp());
  const pageSize = params.limit ?? 5;
  const qRef = query(
    collection(db, 'tasks'),
    where('userId', '==', params.userId),
    where('itemId', '==', params.itemId),
    orderBy('createdAt', 'desc'),
    qLimit(pageSize),
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listRecentTasksForUser(params: {
  userId: string;
  limit?: number;
}): Promise<TaskDoc[]> {
  const db = getFirestore(getFirebaseApp());
  const pageSize = params.limit ?? 5;
  try {
    const qRef = query(
      collection(db, 'tasks'),
      where('userId', '==', params.userId),
      orderBy('createdAt', 'desc'),
      qLimit(pageSize),
    );
    const snap = await getDocs(qRef);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
  } catch {
    const qRef = query(collection(db, 'tasks'), where('userId', '==', params.userId), qLimit(50));
    const snap = await getDocs(qRef);
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort((a: any, b: any) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
      .slice(0, pageSize);
  }
}

// Tutor personal to-dos (lightweight)
export type TutorTodo = {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  createdAt?: any;
};

export async function listTutorTodosByUser(userId: string): Promise<TutorTodo[]> {
  const db = getFirestore(getFirebaseApp());
  const qRef = query(
    collection(db, 'tutorTodos'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    qLimit(100),
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function createTutorTodo(params: {
  userId: string;
  text: string;
}): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());
  const ref = await addDoc(collection(db, 'tutorTodos'), {
    userId: params.userId,
    text: params.text,
    done: false,
    createdAt: serverTimestamp(),
  } as any);
  return { id: ref.id };
}

export async function toggleTutorTodoDone(todoId: string, done: boolean): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await updateDoc(doc(db, 'tutorTodos', todoId), { done } as any);
}

export async function deleteTutorTodo(todoId: string): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  await deleteDoc(doc(db, 'tutorTodos', todoId));
}

export async function createRotationPetition(params: {
  residentId: string;
  rotationId: string;
  type: 'activate' | 'finish';
  reason?: string;
}): Promise<{ id: string }> {
  const db = getFirestore(getFirebaseApp());
  const ref = await addDoc(collection(db, 'rotationPetitions'), {
    residentId: params.residentId,
    rotationId: params.rotationId,
    type: params.type,
    reason: params.reason || '',
    status: 'pending',
    requestedAt: serverTimestamp(),
  } as any);
  return { id: ref.id };
}

export async function getResidentPetitions(residentId: string): Promise<RotationPetition[]> {
  const db = getFirestore(getFirebaseApp());
  const qRef = query(
    collection(db, 'rotationPetitions'),
    where('residentId', '==', residentId),
    orderBy('createdAt', 'desc'),
    qLimit(100),
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function getPetitionsForApprover(approverId: string): Promise<RotationPetition[]> {
  const db = getFirestore(getFirebaseApp());
  const qRef = query(
    collection(db, 'rotationPetitions'),
    where('approverId', '==', approverId),
    orderBy('createdAt', 'desc'),
    qLimit(100),
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}
