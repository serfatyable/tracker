'use client';
import { getAuth } from 'firebase/auth';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { RotationPetition } from '../../types/rotationPetitions';
import { getFirebaseApp } from '../firebase/client';

/**
 * Hook to get pending petition for a specific rotation and current resident.
 * Returns the pending petition if one exists, otherwise null.
 */
export function useResidentPendingPetition(rotationId: string | null) {
  const [petition, setPetition] = useState<RotationPetition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rotationId) {
      setPetition(null);
      setLoading(false);
      return;
    }

    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setPetition(null);
      setLoading(false);
      return;
    }

    const db = getFirestore(getFirebaseApp());
    const qRef = query(
      collection(db, 'rotationPetitions'),
      where('residentId', '==', uid),
      where('rotationId', '==', rotationId),
      where('status', '==', 'pending'),
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        // Get the most recent pending petition (there should only be one)
        const doc = snap.docs[0];
        setPetition(doc ? ({ id: doc.id, ...doc.data() } as RotationPetition) : null);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to load petition status');
        setLoading(false);
      },
    );

    return () => unsub();
  }, [rotationId]);

  return { petition, loading, error } as const;
}
