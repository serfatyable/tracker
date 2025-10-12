'use client';
import { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { collection, getFirestore, onSnapshot, query, where } from 'firebase/firestore';

import { getFirebaseApp } from '../firebase/client';

export function useResidentActiveRotation() {
  const [rotationId, setRotationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRotationId(null);
      setLoading(false);
      return;
    }
    const db = getFirestore(getFirebaseApp());
    const qRef = query(
      collection(db, 'assignments'),
      where('residentId', '==', uid),
      where('endedAt', '==', null),
    );
    const unsub = onSnapshot(
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
    return () => unsub();
  }, []);

  return { rotationId, loading, error } as const;
}
