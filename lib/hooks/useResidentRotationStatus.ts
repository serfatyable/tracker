'use client';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { AssignmentStatus } from '../../types/assignments';
import { getFirebaseApp } from '../firebase/client';

/**
 * Hook to get the per-resident status of a specific rotation assignment.
 * Returns 'inactive', 'active', 'finished', or null if no assignment exists.
 */
export function useResidentRotationStatus(rotationId: string | null) {
  const [status, setStatus] = useState<AssignmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeAssignments: (() => void) | null = null;

    setError(null);

    if (rotationId) {
      setLoading(true);
      setStatus(null);

      const app = getFirebaseApp();
      const auth = getAuth(app);

      const cleanup = () => {
        if (unsubscribeAssignments) {
          unsubscribeAssignments();
          unsubscribeAssignments = null;
        }
      };

      unsubscribeAuth = onAuthStateChanged(
        auth,
        (user) => {
          cleanup();

          if (!user) {
            setStatus(null);
            setLoading(false);
            return;
          }

          const db = getFirestore(app);
          const qRef = query(
            collection(db, 'assignments'),
            where('residentId', '==', user.uid),
            where('rotationId', '==', rotationId),
          );

          setLoading(true);

          unsubscribeAssignments = onSnapshot(
            qRef,
            (snap) => {
              const doc = snap.docs[0];
              setStatus(doc ? ((doc.data() as any).status as AssignmentStatus) : null);
              setLoading(false);
            },
            (e) => {
              setError(e?.message || 'Failed to load assignment status');
              setLoading(false);
            },
          );
        },
        (e) => {
          setError(e?.message || 'Failed to load assignment status');
          setLoading(false);
        },
      );
    } else {
      setStatus(null);
      setLoading(false);
    }

    return () => {
      if (unsubscribeAssignments) {
        unsubscribeAssignments();
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, [rotationId]);

  return { status, loading, error } as const;
}
