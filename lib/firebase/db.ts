import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

import type { UserProfile } from '../../types/auth';

import { getFirebaseApp } from './client';

export async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
    const db = getFirestore(getFirebaseApp());
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const snap = await getDoc(doc(db, 'users', uid));
            return snap.exists() ? (snap.data() as UserProfile) : null;
        } catch (err) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Failed to load user profile');
}

export type TaskDoc = {
	id: string;
	userId: string;
	rotationId: string;
	itemId: string;
	count: number;
	requiredCount: number;
	status: 'pending' | 'approved' | 'rejected';
	feedback?: Array<{ by: string; text: string }>;
};

export async function fetchUserTasks(uid: string): Promise<TaskDoc[]> {
    const db = getFirestore(getFirebaseApp());
    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const qRef = query(collection(db, 'tasks'), where('userId', '==', uid));
            const snap = await getDocs(qRef);
            return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } catch (err) {
            lastErr = err;
            await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
        }
    }
    throw lastErr instanceof Error ? lastErr : new Error('Failed to load tasks');
}
