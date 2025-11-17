'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { User } from 'firebase/auth';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';

import type { UserProfile } from '@/types/auth';

import { getFirebaseApp, getFirebaseStatus } from '../../firebase/client';
import { fetchUserProfile } from '../../firebase/db';
import { queryKeys } from '../keys';

/**
 * Custom hook to get the current Firebase user and their profile
 *
 * This hook combines Firebase Auth state with React Query for profile data:
 * 1. Listens to Firebase Auth state changes
 * 2. Fetches user profile from Firestore using React Query when authenticated
 * 3. Provides consistent loading/error states
 *
 * @returns Object containing:
 *  - firebaseUser: The Firebase Auth user object (or null)
 *  - profile: The user profile from Firestore (or null)
 *  - isLoading: True if auth or profile data is loading
 *  - isError: True if there was an error loading profile
 *  - error: Error object if there was an error
 *  - refetch: Function to manually refetch the profile
 */
export function useCurrentUserProfile() {
  const queryClient = useQueryClient();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseError, setFirebaseError] = useState<string | null>(null);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const config = getFirebaseStatus();
    if (!config.ok) {
      setFirebaseError(`Firebase not configured. Missing: ${config.missing.join(', ')}`);
      setAuthLoading(false);
      return;
    }

    const auth = getAuth(getFirebaseApp());
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthLoading(false);

      // When user signs out, invalidate all user-related queries
      if (!user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      }
    });

    return () => unsub();
  }, [queryClient]);

  // Fetch user profile using React Query
  const {
    data: profile,
    isLoading: profileLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.users.currentProfile(),
    queryFn: async () => {
      if (!firebaseUser) return null;
      return fetchUserProfile(firebaseUser.uid);
    },
    enabled: !!firebaseUser && !authLoading,
    // User profile is relatively stable, keep it cached longer
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Retry profile fetch failures more aggressively since it's critical
    retry: 3,
  });

  // Combine loading states
  const isLoading = authLoading || profileLoading;

  // For backward compatibility with old hook interface
  const status: 'loading' | 'ready' | 'error' = isLoading
    ? 'loading'
    : isError || firebaseError
      ? 'error'
      : 'ready';

  return {
    // New React Query style
    firebaseUser,
    profile: profile ?? null,
    isLoading,
    isError: isError || !!firebaseError,
    error: firebaseError || (error as Error)?.message || null,
    refetch,
    // Old hook compatibility
    status,
    data: profile ?? null,
  } as const;
}
