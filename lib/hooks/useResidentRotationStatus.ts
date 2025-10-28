'use client';
import { getAuth } from 'firebase/auth';
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
    if (!rotationId) {
      setStatus(null);
      setLoading(false);
      return;
    }

    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setStatus(null);
      setLoading(false);
      return;
    }

    const db = getFirestore(getFirebaseApp());
    const qRef = query(
      collection(db, 'assignments'),
      where('residentId', '==', uid),
      where('rotationId', '==', rotationId),
    );

    const unsub = onSnapshot(
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

    return () => unsub();
  }, [rotationId]);

  return { status, loading, error } as const;
}
