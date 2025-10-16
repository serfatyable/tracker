'use client';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { UserProfile } from '../../types/auth';
import { getFirebaseApp } from '../firebase/client';

export function useUsersByRole() {
  const [residents, setResidents] = useState<UserProfile[]>([]);
  const [tutors, setTutors] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());
        const usersCol = collection(db, 'users');
        const [resSnap, tutSnap] = await Promise.all([
          getDocs(
            query(usersCol, where('role', '==', 'resident'), where('status', '==', 'active')),
          ),
          getDocs(query(usersCol, where('role', '==', 'tutor'), where('status', '==', 'active'))),
        ]);
        if (!cancelled) {
          setResidents(resSnap.docs.map((d) => ({ ...(d.data() as any) })));
          setTutors(tutSnap.docs.map((d) => ({ ...(d.data() as any) })));
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load users');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { residents, tutors, loading, error } as const;
}
