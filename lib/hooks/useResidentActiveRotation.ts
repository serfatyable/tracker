'use client';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { getFirebaseApp } from '../firebase/client';

export function useResidentActiveRotation() {
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeAuth: (() => void) | null = null;
    let unsubscribeAssignments: (() => void) | null = null;

    setError(null);
    setLoading(true);
    setRotationId(null);

    const app = getFirebaseApp();
    const auth = getAuth(app);

    const cleanupAssignments = () => {
      if (unsubscribeAssignments) {
        unsubscribeAssignments();
        unsubscribeAssignments = null;
      }
    };

    unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        cleanupAssignments();

        if (!user) {
          setRotationId(null);
          setLoading(false);
          return;
        }

        const db = getFirestore(app);
        const qRef = query(
          collection(db, 'assignments'),
          where('residentId', '==', user.uid),
          where('status', '==', 'active'),
        );

        setLoading(true);

        unsubscribeAssignments = onSnapshot(
          qRef,
          (snap) => {
            const doc = snap.docs[0];
            setRotationId(doc ? ((doc.data() as any).rotationId as string) : null);
            setLoading(false);
          },
          (e) => {
            setError(e?.message || 'Failed to load assignment');
            setLoading(false);
          },
        );
      },
      (e) => {
        setError(e?.message || 'Failed to load assignment');
        setLoading(false);
      },
    );

    return () => {
      if (unsubscribeAssignments) {
        unsubscribeAssignments();
      }
      if (unsubscribeAuth) {
        unsubscribeAuth();
      }
    };
  }, []);

  return { rotationId, loading, error } as const;
}
