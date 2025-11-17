'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getAuth } from 'firebase/auth';

import { getFirebaseApp } from '../../firebase/client';
import { createTask, deleteTask, type TaskDoc } from '../../firebase/db';
import { queryKeys } from '../keys';

/**
 * Parameters for creating a new task
 */
interface CreateTaskParams {
  userId: string;
  rotationId: string;
  itemId: string;
  count: number;
  requiredCount: number;
  note?: string;
}

/**
 * Custom hook for creating tasks with optimistic updates
 *
 * Features:
 * - Optimistically adds task to cache before server response
 * - Automatically rolls back on error
 * - Invalidates related queries on success
 *
 * @example
 * ```tsx
 * function CreateTaskButton() {
 *   const { mutate, isPending, isError, error } = useCreateTask();
 *
 *   const handleCreate = () => {
 *     mutate({
 *       userId: 'user123',
 *       rotationId: 'rotation456',
 *       itemId: 'item789',
 *       count: 5,
 *       requiredCount: 10,
 *       note: 'Completed procedure',
 *     });
 *   };
 *
 *   return (
 *     <button onClick={handleCreate} disabled={isPending}>
 *       {isPending ? 'Creating...' : 'Create Task'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const auth = getAuth(getFirebaseApp());
  const currentUserId = auth.currentUser?.uid;

  return useMutation({
    mutationFn: createTask,

    // Optimistic update: Add task immediately to cache
    onMutate: async (newTask) => {
      const queryKey = queryKeys.tasks.byUser(newTask.userId);

      // Cancel any outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<TaskDoc[]>(queryKey);

      // Optimistically update cache with temporary task
      if (previousTasks) {
        const optimisticTask: TaskDoc = {
          id: `temp-${Date.now()}`, // Temporary ID
          userId: newTask.userId,
          rotationId: newTask.rotationId,
          itemId: newTask.itemId,
          count: newTask.count,
          requiredCount: newTask.requiredCount,
          status: 'pending',
          note: newTask.note,
          createdAt: new Date(),
          tutorIds: [],
        };

        queryClient.setQueryData<TaskDoc[]>(queryKey, [...previousTasks, optimisticTask]);
      }

      // Return context with previous value for rollback
      return { previousTasks, queryKey };
    },

    // On error, rollback optimistic update
    onError: (err, newTask, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
    },

    // On success, invalidate queries to refetch with real data
    onSuccess: (data, variables) => {
      // Invalidate task queries for this user
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byUser(variables.userId) });

      // Invalidate pending task counts
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.pending(variables.userId) });

      // Invalidate rotation-specific tasks
      queryClient.invalidateQueries({
        queryKey: queryKeys.tasks.byRotation(variables.rotationId),
      });

      // If the current user is a tutor, invalidate their dashboard
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.tutor(currentUserId) });
      }
    },
  });
}

/**
 * Custom hook for deleting tasks with optimistic updates
 *
 * Features:
 * - Optimistically removes task from cache before server response
 * - Automatically rolls back on error
 * - Invalidates related queries on success
 *
 * @example
 * ```tsx
 * function DeleteTaskButton({ taskId, userId }: { taskId: string; userId: string }) {
 *   const { mutate, isPending } = useDeleteTask();
 *
 *   const handleDelete = () => {
 *     mutate({ taskId, userId });
 *   };
 *
 *   return (
 *     <button onClick={handleDelete} disabled={isPending}>
 *       {isPending ? 'Deleting...' : 'Delete'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const auth = getAuth(getFirebaseApp());
  const currentUserId = auth.currentUser?.uid;

  return useMutation({
    mutationFn: ({ taskId }: { taskId: string; userId: string }) => deleteTask(taskId),

    // Optimistic update: Remove task immediately from cache
    onMutate: async ({ taskId, userId }) => {
      const queryKey = queryKeys.tasks.byUser(userId);

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData<TaskDoc[]>(queryKey);

      // Optimistically remove task from cache
      if (previousTasks) {
        queryClient.setQueryData<TaskDoc[]>(
          queryKey,
          previousTasks.filter((task) => task.id !== taskId),
        );
      }

      // Return context for rollback
      return { previousTasks, queryKey, taskId };
    },

    // On error, rollback optimistic update
    onError: (err, variables, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(context.queryKey, context.previousTasks);
      }
    },

    // On success, invalidate queries to ensure consistency
    onSuccess: (data, { userId, taskId }) => {
      // Invalidate task queries for this user
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byUser(userId) });

      // Invalidate pending task counts
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.pending(userId) });

      // Invalidate all task lists (since we don't know which rotation this belonged to)
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });

      // If the current user is a tutor, invalidate their dashboard
      if (currentUserId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.tutor(currentUserId) });
      }
    },
  });
}

/**
 * Combined export for all task mutations
 * Provides a unified interface for task operations
 *
 * @example
 * ```tsx
 * function TaskManager() {
 *   const { createTask, deleteTask } = useTaskMutations();
 *
 *   return (
 *     <div>
 *       <button onClick={() => createTask.mutate({ ... })}>
 *         Create Task
 *       </button>
 *       <button onClick={() => deleteTask.mutate({ taskId: '123', userId: 'user1' })}>
 *         Delete Task
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTaskMutations() {
  const createTaskMutation = useCreateTask();
  const deleteTaskMutation = useDeleteTask();

  return {
    createTask: createTaskMutation,
    deleteTask: deleteTaskMutation,
    // Convenience flags for overall mutation state
    isPending: createTaskMutation.isPending || deleteTaskMutation.isPending,
    isError: createTaskMutation.isError || deleteTaskMutation.isError,
    error: createTaskMutation.error || deleteTaskMutation.error,
  } as const;
}
