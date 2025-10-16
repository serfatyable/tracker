'use client';
import { useEffect, useState } from 'react';

import type { Rotation } from '../../types/rotations';
import { listRotations } from '../firebase/admin';

export function useActiveRotations() {
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const page = await listRotations({ status: 'active', limit: 200 });
        if (!cancelled) {
          setRotations(page.items || []);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load rotations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { rotations, loading, error } as const;
}
