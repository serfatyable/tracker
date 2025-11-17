'use client';

import { useQuery } from '@tanstack/react-query';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

import type { Rotation } from '@/types/rotations';

import { listRotations } from '../../firebase/admin';
import { getFirebaseApp } from '../../firebase/client';
import { rotationConverter } from '../../firebase/converters';
import { queryKeys } from '../keys';

/**
 * Fetch rotations from Firestore
 * Tries admin API first, falls back to direct Firestore access
 */
async function fetchRotations(): Promise<Rotation[]> {
  try {
    const page = await listRotations({ limit: 500 });
    return page.items || [];
  } catch (e) {
    // Fallback to direct Firestore access
    const db = getFirestore(getFirebaseApp());
    const snap = await getDocs(collection(db, 'rotations').withConverter(rotationConverter));
    return snap.docs.map((d) => d.data());
  }
}

/**
 * Custom hook to fetch all rotations using React Query
 *
 * Features:
 * - Automatic caching and background refetching
 * - Consistent loading/error states
 * - Retry logic with exponential backoff
 * - Optimized for rotation data that doesn't change frequently
 *
 * @returns Object containing:
 *  - rotations: Array of rotation objects
 *  - isLoading: True if data is being fetched for the first time
 *  - isFetching: True if data is being fetched (includes background refetches)
 *  - isError: True if there was an error
 *  - error: Error object if there was an error
 *  - refetch: Function to manually refetch rotations
 *
 * @example
 * ```tsx
 * function RotationList() {
 *   const { rotations, isLoading, isError, error } = useRotations();
 *
 *   if (isLoading) return <div>Loading...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *
 *   return <ul>{rotations.map(r => <li key={r.id}>{r.name}</li>)}</ul>;
 * }
 * ```
 */
export function useRotations() {
  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: queryKeys.rotations.list(),
    queryFn: fetchRotations,
    // Rotations don't change frequently, keep cached for longer
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    // Retry failures since this is critical data
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // For backward compatibility with old hook interface
  const rotations = data || [];
  const loading = isLoading;

  return {
    // New React Query style
    rotations,
    isLoading,
    isFetching,
    isError,
    error: error as Error | null,
    refetch,
    // Old hook compatibility
    loading,
  } as const;
}
