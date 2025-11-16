'use client';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { Audience, ReflectionTemplate } from '../../types/reflections';
import { getFirebaseApp } from '../firebase/client';

export function useLatestPublishedTemplate(audience: Audience, taskType?: string) {
  const [templates, setTemplates] = useState<ReflectionTemplate[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const db = getFirestore(getFirebaseApp());
        const ref = collection(db, 'reflectionTemplates');
        const qRef = query(ref, where('audience', '==', audience));
        const snap = await getDocs(qRef);
        if (cancelled) return;
        const all = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as ReflectionTemplate[];
        setTemplates(all);
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
  }, [audience]);

  const latest = useMemo(() => {
    if (!templates) return null;
    const type = taskType ?? '*';
    const published = templates.filter((t) => t.status === 'published');
    const forType = published.filter(
      (t) => t.taskTypes?.includes(type) || t.taskTypes?.includes('*'),
    );
    if (forType.length === 0) return null;
    return forType.sort((a, b) => (b.version || 0) - (a.version || 0))[0];
  }, [templates, taskType]);

  return { template: latest, loading, error };
}

type UseReflectionTemplatesResult = {
  templates: ReflectionTemplate[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  saveTemplate: (template: ReflectionTemplate) => Promise<void>;
  publishTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (templateId: string) => Promise<void>;
  duplicateTemplate: (template: ReflectionTemplate) => Promise<void>;
};

export function useReflectionTemplates(
  audience: Audience | '',
): UseReflectionTemplatesResult {
  const [templates, setTemplates] = useState<ReflectionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    if (!audience) {
      setTemplates([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const db = getFirestore(getFirebaseApp());
      const qRef = query(
        collection(db, 'reflectionTemplates'),
        where('audience', '==', audience as Audience),
      );
      const snap = await getDocs(qRef);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReflectionTemplate[];
      setTemplates(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to load templates';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [audience]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const saveTemplate = useCallback(
    async (template: ReflectionTemplate) => {
      const db = getFirestore(getFirebaseApp());

      if (template.id) {
        await updateDoc(doc(db, 'reflectionTemplates', template.id), {
          ...template,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'reflectionTemplates'), {
          ...template,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await fetchTemplates();
    },
    [fetchTemplates],
  );

  const publishTemplate = useCallback(
    async (templateId: string) => {
      const db = getFirestore(getFirebaseApp());
      await updateDoc(doc(db, 'reflectionTemplates', templateId), {
        status: 'published',
        publishedAt: serverTimestamp(),
      });

      await fetchTemplates();
    },
    [fetchTemplates],
  );

  const deleteTemplate = useCallback(
    async (templateId: string) => {
      const db = getFirestore(getFirebaseApp());
      await deleteDoc(doc(db, 'reflectionTemplates', templateId));
      await fetchTemplates();
    },
    [fetchTemplates],
  );

  const duplicateTemplate = useCallback(
    async (template: ReflectionTemplate) => {
      const db = getFirestore(getFirebaseApp());
      const newTemplate = {
        ...template,
        id: undefined,
        status: 'draft' as const,
        version: (template.version || 0) + 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'reflectionTemplates'), newTemplate);
      await fetchTemplates();
    },
    [fetchTemplates],
  );

  return {
    templates,
    loading,
    error,
    refetch: fetchTemplates,
    saveTemplate,
    publishTemplate,
    deleteTemplate,
    duplicateTemplate,
  };
}
