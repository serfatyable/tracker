'use client';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

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
          ...(d.data() as any),
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
