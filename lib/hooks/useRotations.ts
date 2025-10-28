'use client';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Rotation } from '../../types/rotations';
import { listRotations } from '../firebase/admin';
import { getFirebaseApp } from '../firebase/client';

export function useRotations() {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const page = await listRotations({ limit: 500 });
        setRotations(page.items || []);
      } catch (e: any) {
        try {
          const db = getFirestore(getFirebaseApp());
          const snap = await getDocs(collection(db, 'rotations'));
          const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rotation[];
          setRotations(items);
        } catch (e2: any) {
          setError(e2?.message || e?.message || 'Failed to load rotations');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return { rotations, loading, error } as const;
}
