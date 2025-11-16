'use client';
import { getFirestore, collection, query, where, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { UserProfile } from '../../types/auth';
import { getFirebaseApp } from '../firebase/client';

export function usePendingUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const usersCol = collection(db, 'users');
    const qRef = query(usersCol, where('status', '==', 'pending'));

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const pendingUsers = snap.docs.map((d) => ({
          uid: d.id,
          ...(d.data() as Omit<UserProfile, 'uid'>),
        })) as UserProfile[];
        setUsers(pendingUsers);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to load pending users');
        setLoading(false);
      },
    );

    return () => unsub();
  }, []);

  return { users, count: users.length, loading, error } as const;
}
