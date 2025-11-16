'use client';
import { getAuth } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { AuthorRole, Reflection, ReflectionListItem } from '../../types/reflections';
import { getFirebaseApp } from '../firebase/client';

function makeReflectionId(taskOccurrenceId: string, authorId: string, subjectId?: string | null) {
  if (subjectId) {
    return `${taskOccurrenceId}_${authorId}_${subjectId}`;
  }
  return `${taskOccurrenceId}_${authorId}`;
}

export function useReflection(
  taskOccurrenceId: string | null,
  authorId: string | null,
  subjectId?: string | null,
) {
  const [data, setData] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!taskOccurrenceId || !authorId) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const db = getFirestore(getFirebaseApp());
        const primaryId = makeReflectionId(
          taskOccurrenceId as string,
          authorId as string,
          subjectId || undefined,
        );
        const legacyId = subjectId
          ? makeReflectionId(taskOccurrenceId as string, authorId as string)
          : null;
        const candidates = legacyId && legacyId !== primaryId ? [primaryId, legacyId] : [primaryId];
        let next: Reflection | null = null;
        for (const rid of candidates) {
          const snap = await getDoc(doc(db, 'reflections', rid));
          if (snap.exists()) {
            next = { id: snap.id, ...(snap.data() as any) } as Reflection;
            break;
          }
        }
        if (!cancelled) setData(next);
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [taskOccurrenceId, authorId, subjectId]);

  return { reflection: data, loading, error };
}

export function useReflectionsForResident(residentId: string | null) {
  const [list, setList] = useState<ReflectionListItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!residentId) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const db = getFirestore(getFirebaseApp());
        const qRef = query(
          collection(db, 'reflections'),
          where('residentId', '==', residentId),
          orderBy('submittedAt', 'desc'),
        );
        const snap = await getDocs(qRef);
        if (!cancelled)
          setList(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReflectionListItem[],
          );
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [residentId]);
  return { list, loading, error };
}

export function useReflectionsForTutor(tutorId: string | null) {
  const [list, setList] = useState<ReflectionListItem[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!tutorId) return;
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const db = getFirestore(getFirebaseApp());
        const qRef = query(
          collection(db, 'reflections'),
          where('tutorId', '==', tutorId),
          orderBy('submittedAt', 'desc'),
        );
        const snap = await getDocs(qRef);
        if (!cancelled)
          setList(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as ReflectionListItem[],
          );
      } catch (e) {
        if (!cancelled) setError(e as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [tutorId]);
  return { list, loading, error };
}

export async function submitReflection(params: {
  taskOccurrenceId: string;
  taskType: string;
  templateKey: string;
  templateVersion: number;
  authorId: string;
  authorRole: AuthorRole;
  residentId: string;
  tutorId?: string | null;
  answers: Record<string, string>;
}): Promise<{ id: string }> {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('auth/missing-current-user');
  }
  const effectiveAuthorId = currentUser.uid;
  if (params.authorId && params.authorId !== effectiveAuthorId) {
    console.warn(
      'submitReflection authorId mismatch – using authenticated user instead of provided value',
    );
  }
  const db = getFirestore(app);
  const rid = makeReflectionId(
    params.taskOccurrenceId,
    effectiveAuthorId,
    params.authorRole === 'tutor' ? params.residentId : undefined,
  );
  const ref = doc(db, 'reflections', rid);
  await setDoc(
    ref,
    {
      taskOccurrenceId: params.taskOccurrenceId,
      taskType: params.taskType,
      templateKey: params.templateKey,
      templateVersion: params.templateVersion,
      authorId: effectiveAuthorId,
      authorRole: params.authorRole,
      residentId: params.residentId,
      tutorId: params.authorRole === 'tutor' ? effectiveAuthorId : params.tutorId || null,
      answers: params.answers,
      submittedAt: serverTimestamp(),
    } as any,
    { merge: false },
  );
  return { id: rid };
}
