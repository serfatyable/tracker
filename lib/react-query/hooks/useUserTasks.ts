'use client';

import { useQuery } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';

import { getFirebaseApp } from '../../firebase/client';
import { fetchUserTasks, type TaskDoc } from '../../firebase/db';
import { queryKeys } from '../keys';

/**
 * Custom hook to fetch tasks for the current user using React Query
 *
 * Features:
 * - Automatic caching and background refetching
 * - Consistent loading/error states
 * - Retry logic with exponential backoff
 * - Optimized for task data that changes frequently
 *
 * @returns Object containing:
 *  - tasks: Array of task documents
 *  - isLoading: True if data is being fetched for the first time
 *  - isFetching: True if data is being fetched (includes background refetches)
 *  - isError: True if there was an error
 *  - error: Error object if there was an error
 *  - refetch: Function to manually refetch tasks
 *  - refresh: Alias for refetch (backward compatibility)
 *
 * @example
 * ```tsx
 * function TaskList() {
 *   const { tasks, isLoading, isError, error, refetch } = useUserTasks();
 *
 *   if (isLoading) return <div>Loading tasks...</div>;
 *   if (isError) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <button onClick={() => refetch()}>Refresh</button>
 *       <ul>{tasks.map(t => <li key={t.id}>{t.note}</li>)}</ul>
 *     </div>
 *   );
 * }
 * ```
 */
export function useUserTasks() {
  // Get current user ID
  const auth = getAuth(getFirebaseApp());
  const userId = auth.currentUser?.uid;

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: queryKeys.tasks.byUser(userId || ''),
    queryFn: async () => {
      if (!userId) return [];
      return fetchUserTasks(userId);
    },
    enabled: !!userId,
    // Tasks change frequently, keep stale time shorter
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    // Refetch on window focus to keep tasks up to date
    refetchOnWindowFocus: true,
    // Retry failures
    retry: 2,
  });

  // For backward compatibility with old hook interface
  const tasks = data || [];
  const loading = isLoading;

  return {
    // New React Query style
    tasks,
    isLoading,
    isFetching,
    isError,
    error: error as Error | null,
    refetch,
    // Old hook compatibility
    loading,
    refresh: refetch,
  } as const;
}
