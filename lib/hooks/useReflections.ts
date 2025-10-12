'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addDoc,
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
import { getFirebaseApp } from '../firebase/client';
import type { AuthorRole, Reflection, ReflectionListItem } from '../../types/reflections';

function makeReflectionId(taskOccurrenceId: string, authorId: string) {
  return `${taskOccurrenceId}_${authorId}`;
}

export function useReflection(taskOccurrenceId: string | null, authorId: string | null) {
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
        const rid = makeReflectionId(taskOccurrenceId as string, authorId as string);
        const snap = await getDoc(doc(db, 'reflections', rid));
        if (!cancelled)
          setData(snap.exists() ? ({ id: snap.id, ...(snap.data() as any) } as Reflection) : null);
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
  }, [taskOccurrenceId, authorId]);

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
  const db = getFirestore(getFirebaseApp());
  const rid = makeReflectionId(params.taskOccurrenceId, params.authorId);
  const ref = doc(db, 'reflections', rid);
  await setDoc(
    ref,
    {
      taskOccurrenceId: params.taskOccurrenceId,
      taskType: params.taskType,
      templateKey: params.templateKey,
      templateVersion: params.templateVersion,
      authorId: params.authorId,
      authorRole: params.authorRole,
      residentId: params.residentId,
      tutorId: params.tutorId || null,
      answers: params.answers,
      submittedAt: serverTimestamp(),
    } as any,
    { merge: false },
  );
  return { id: rid };
}
