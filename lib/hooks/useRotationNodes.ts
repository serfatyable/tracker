'use client';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

import type { RotationNode } from '../../types/rotations';
import { getFirebaseApp } from '../firebase/client';
import { withTimeoutAndRetry, getNetworkErrorMessage } from '../utils/networkUtils';

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
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (cache[rotationId]) {
          if (!cancelled) {
            setNodes(cache[rotationId]!);
            setLoading(false);
          }
          return;
        }

        const result = await withTimeoutAndRetry(
          async () => {
            const db = getFirestore(getFirebaseApp());
            const snap = await getDocs(
              query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId)),
            );
            return snap.docs.map((d) => ({
              id: d.id,
              ...(d.data() as any),
            })) as unknown as RotationNode[];
          },
          {
            timeout: 20000, // 20 seconds for rotation nodes (can be large)
            retries: 3,
            operationName: 'load rotation nodes',
          },
        );

        if (cancelled) return;

        cache[rotationId] = result;
        setNodes(result);
      } catch (e: any) {
        if (!cancelled) {
          const userMessage = getNetworkErrorMessage(e, 'Failed to load rotation content');
          setError(userMessage);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
