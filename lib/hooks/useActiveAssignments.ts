'use client';
import { onSnapshot, query, collection, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Assignment, AssignmentStatus } from '../../types/assignments';
import { getFirebaseApp } from '../firebase/client';

export function useActiveAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const db = getFirestore(getFirebaseApp());
    const qRef = query(collection(db, 'assignments'));
    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const rawAssignments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        const activeAssignments = rawAssignments
          .filter((assignment) => {
            const status = assignment.status as AssignmentStatus | undefined;
            if (status === 'active') return true;
            if (status === undefined) {
              // Legacy documents without a status should still count as active
              // as long as they have not been explicitly ended.
              return assignment.endedAt == null;
            }
            return false;
          })
          .map((assignment) => ({
            ...assignment,
            status: (assignment.status ?? 'active') as AssignmentStatus,
          }));
        setAssignments(activeAssignments as Assignment[]);
        setLoading(false);
      },
      (e) => {
        setError(e?.message || 'Failed to listen assignments');
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { assignments, loading, error } as const;
}
