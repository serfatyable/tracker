'use client';
import { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getFirebaseApp } from '../firebase/client';

import type { Rotation, RotationStatus } from '../../types/rotations';
import { listRotations } from '../firebase/admin';

export function useRotations(params?: { status?: RotationStatus }) {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.debug('[useRotations] fetching listRotations...', params);
        const page = await listRotations({ status: params?.status, limit: 500 });
        console.debug('[useRotations] listRotations success', page?.items?.length || 0);
        setRotations(page.items || []);
      } catch (e: any) {
        console.warn('[useRotations] listRotations failed, falling back to raw getDocs', e);
        try {
          const db = getFirestore(getFirebaseApp());
          const snap = await getDocs(collection(db, 'rotations'));
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rotation[];
          console.debug('[useRotations] raw getDocs success', items.length);
          setRotations(items);
        } catch (e2: any) {
          console.error('[useRotations] raw getDocs failed', e2);
          setError(e2?.message || e?.message || 'Failed to load rotations');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [params?.status]);

  return { rotations, loading, error } as const;
}
