"use client";
import type { User } from 'firebase/auth';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

import type { UserProfile } from '../../types/auth';
import { getFirebaseApp, getFirebaseStatus } from '../firebase/client';
import { fetchUserProfile } from '../firebase/db';

type HookStatus = 'loading' | 'ready' | 'error';

export function useCurrentUserProfile(): {
	status: HookStatus;
	firebaseUser: User | null;
	data: UserProfile | null;
	error: string | null;
} {
	const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
	const [profile, setProfile] = useState<UserProfile | null>(null);
	const [status, setStatus] = useState<HookStatus>('loading');
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const config = getFirebaseStatus();
		if (!config.ok) {
			setStatus('error');
			setError(`Firebase not configured. Missing: ${config.missing.join(', ')}`);
			return;
		}

		const auth = getAuth(getFirebaseApp());
		const unsub = onAuthStateChanged(auth, async (user) => {
			setFirebaseUser(user);
			if (!user) {
				setProfile(null);
				setStatus('ready');
				return;
			}
			try {
				setStatus('loading');
				const p = await fetchUserProfile(user.uid);
				setProfile(p);
				setStatus('ready');
			} catch (e: any) {
				setError(e?.message || 'Failed to load profile');
				setStatus('error');
			}
		});
		return () => unsub();
	}, []);

	return { status, firebaseUser, data: profile, error } as const;
}
