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
  const ref = await addDoc(collection(db, 'tasks'), {
    userId: params.userId,
    rotationId: params.rotationId,
    itemId: params.itemId,
    count: params.count,
    requiredCount: params.requiredCount,
    status: 'pending',
    note: params.note || null,
    createdAt: serverTimestamp(),
  } as any);
  return { id: ref.id };
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
