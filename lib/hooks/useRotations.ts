'use client';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Rotation } from '../../types/rotations';
import { getFirebaseApp } from '../firebase/client';

export function useRotations(enabled = true) {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);
        // Direct Firestore query without ordering to avoid index requirements
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(collection(db, 'rotations'));
        const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Rotation[];
        // Sort by name_en in memory (client-side) to avoid index requirement
        items.sort((a, b) => {
          const nameA = (a.name_en || a.name || '').toLowerCase();
          const nameB = (b.name_en || b.name || '').toLowerCase();
          return nameA.localeCompare(nameB);
        });
        setRotations(items);
      } catch (e: any) {
        console.error('Failed to load rotations:', e);
        setError(e?.message || 'Failed to load rotations');
        // Don't throw - just set empty array so the page doesn't break
        setRotations([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  return { rotations, loading, error } as const;
}
