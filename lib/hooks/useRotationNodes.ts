'use client';
import { useEffect, useMemo, useState } from 'react';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import type { RotationNode } from '../../types/rotations';
import { getFirebaseApp } from '../firebase/client';

const cache: Record<string, RotationNode[]> = {};

export function useRotationNodes(rotationId: string | null) {
  const [nodes, setNodes] = useState<RotationNode[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rotationId) {
      setNodes([]);
      return;
    }
    (async () => {
      try {
        setLoading(true);
        if (cache[rotationId]) {
          setNodes(cache[rotationId]!);
          setLoading(false);
          return;
        }
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(
          query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId)),
        );
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as unknown as RotationNode[];
        cache[rotationId] = list;
        setNodes(list);
      } catch (e: any) {
        setError(e?.message || 'Failed to load rotation nodes');
      } finally {
        setLoading(false);
      }
    })();
  }, [rotationId]);

  const byId = useMemo(() => {
    const map: Record<string, RotationNode> = {};
    nodes.forEach((n) => {
      map[n.id] = n;
    });
    return map;
  }, [nodes]);

  return { nodes, byId, loading, error } as const;
}
