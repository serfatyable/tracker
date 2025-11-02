'use client';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
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
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribePetitions: (() => void) | null = null;

    setError(null);

    if (rotationId) {
      setLoading(true);
      setPetition(null);

      const app = getFirebaseApp();
      const auth = getAuth(app);

      const cleanup = () => {
        if (unsubscribePetitions) {
          unsubscribePetitions();
          unsubscribePetitions = null;
        }
      };

      unsubscribeAuth = onAuthStateChanged(
        auth,
        (user) => {
          cleanup();

          if (!user) {
            setPetition(null);
            setLoading(false);
            return;
          }

          const db = getFirestore(app);
          const qRef = query(
            collection(db, 'rotationPetitions'),
            where('residentId', '==', user.uid),
            where('rotationId', '==', rotationId),
            where('status', '==', 'pending'),
          );

          setLoading(true);

          unsubscribePetitions = onSnapshot(
            qRef,
            (snap) => {
              const doc = snap.docs[0];
              setPetition(doc ? ({ id: doc.id, ...doc.data() } as RotationPetition) : null);
              setLoading(false);
            },
            (e) => {
              setError(e?.message || 'Failed to load petition status');
              setLoading(false);
            },
          );
        },
        (e) => {
          setError(e?.message || 'Failed to load petition status');
          setLoading(false);
        },
      );
    } else {
      setPetition(null);
      setLoading(false);
    }

    return () => {
      if (unsubscribePetitions) {
        unsubscribePetitions();
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [rotationId]);

  return { petition, loading, error } as const;
}
