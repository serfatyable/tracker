'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, getFirestore } from 'firebase/firestore';

import { getFirebaseApp } from '../firebase/client';
import type { RotationPetition } from '../../types/rotationPetitions';

export function useRotationPetitions(residentId: string | null) {
  const [petitions, setPetitions] = useState<RotationPetition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!residentId) {
      setPetitions([]);
      setLoading(false);
      return;
    }

    const db = getFirestore(getFirebaseApp());
    const q = query(
      collection(db, 'rotationPetitions'),
      where('residentId', '==', residentId),
      orderBy('requestedAt', 'desc'),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as any),
        })) as RotationPetition[];
        setPetitions(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching rotation petitions:', err);
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [residentId]);

  return { petitions, loading, error };
}
