/**
 * React Query Hooks
 *
 * Centralized exports for all React Query hooks in the Tracker app.
 * These hooks wrap Firebase operations with React Query for:
 * - Automatic caching and background refetching
 * - Optimistic updates
 * - Consistent loading/error states
 * - Query invalidation strategies
 */

// Query hooks
export { useCurrentUserProfile } from './useCurrentUserProfile';
export { useRotations } from './useRotations';
export { useUserTasks } from './useUserTasks';

// Mutation hooks
export { useCreateTask, useDeleteTask, useTaskMutations } from './useTaskMutations';

// Re-export query keys for manual cache manipulation
export { queryKeys } from '../keys';
