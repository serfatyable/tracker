"use client";
import { onSnapshot, query, collection, where, getFirestore } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import type { Assignment } from '../../types/assignments';
import { getFirebaseApp } from '../firebase/client';

export function useActiveAssignments() {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const db = getFirestore(getFirebaseApp());
        const qRef = query(collection(db, 'assignments'), where('endedAt', '==', null));
        const unsub = onSnapshot(qRef, (snap) => {
            setAssignments(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Assignment[]);
            setLoading(false);
        }, (e) => {
            setError(e?.message || 'Failed to listen assignments');
            setLoading(false);
        });
        return () => unsub();
    }, []);

    return { assignments, loading, error } as const;
}


