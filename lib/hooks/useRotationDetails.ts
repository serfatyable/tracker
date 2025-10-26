'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

import { getFirebaseApp } from '../firebase/client';
import type { Rotation } from '../../types/rotations';

export function useRotationDetails(rotationId: string | null) {
  const [rotation, setRotation] = useState<Rotation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!rotationId) {
      setRotation(null);
      setLoading(false);
      return;
    }

    const fetchRotation = async () => {
      try {
        const db = getFirestore(getFirebaseApp());
        const snap = await getDoc(doc(db, 'rotations', rotationId));
        if (snap.exists()) {
          setRotation({ id: snap.id, ...(snap.data() as any) } as Rotation);
        } else {
          setRotation(null);
        }
        setLoading(false);
        setError(null);
      } catch (err) {
        console.error('Error fetching rotation details:', err);
        setError(err as Error);
        setLoading(false);
      }
    };

    fetchRotation();
  }, [rotationId]);

  return { rotation, loading, error };
}
