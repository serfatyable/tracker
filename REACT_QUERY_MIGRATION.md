# React Query Migration Guide

This guide explains how to migrate from custom Firebase hooks to TanStack Query (React Query) in the Tracker app.

## Overview

The migration to React Query provides:
- **Automatic caching** with configurable stale times
- **Background refetching** to keep data fresh
- **Optimistic updates** for better UX
- **Consistent loading/error states**
- **Query invalidation strategies** for cache management
- **Built-in retry logic** with exponential backoff
- **DevTools** for debugging queries and cache

## Installation

React Query and DevTools are already installed:
```bash
pnpm add @tanstack/react-query @tanstack/react-query-devtools
```

## Setup

### 1. QueryClient Provider

The `ReactQueryProvider` is set up in `app/layout.tsx`:

```tsx
import { ReactQueryProvider } from '../lib/react-query/provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ReactQueryProvider>
          <I18nProvider>
            {children}
          </I18nProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
```

### 2. Query Keys Factory

All query keys are centralized in `lib/react-query/keys.ts` for type-safe cache management:

```ts
import { queryKeys } from '@/lib/react-query/keys';

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: queryKeys.users.all });

// Invalidate specific user profile
queryClient.invalidateQueries({ queryKey: queryKeys.users.profile('user123') });

// Invalidate all tasks for a user
queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byUser('user123') });
```

## Hook Migration Examples

### useCurrentUserProfile

**Before (Old Hook):**
```tsx
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';

function ProfileComponent() {
  const { status, firebaseUser, data, error, refetch } = useCurrentUserProfile();

  if (status === 'loading') return <div>Loading...</div>;
  if (status === 'error') return <div>Error: {error}</div>;
  if (!data) return <div>No profile</div>;

  return <div>Welcome, {data.fullName}</div>;
}
```

**After (React Query):**
```tsx
import { useCurrentUserProfile } from '@/lib/react-query/hooks';

function ProfileComponent() {
  const { firebaseUser, profile, isLoading, isError, error, refetch } = useCurrentUserProfile();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error}</div>;
  if (!profile) return <div>No profile</div>;

  return <div>Welcome, {profile.fullName}</div>;
}
```

**Changes:**
- ✅ `status` → `isLoading`, `isError` (more granular)
- ✅ `data` → `profile` (more semantic)
- ✅ Backward compatible: `status` and `data` still available

### useRotations

**Before (Old Hook):**
```tsx
import { useRotations } from '@/lib/hooks/useRotations';

function RotationList() {
  const { rotations, loading, error } = useRotations();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <ul>
      {rotations.map(r => <li key={r.id}>{r.name}</li>)}
    </ul>
  );
}
```

**After (React Query):**
```tsx
import { useRotations } from '@/lib/react-query/hooks';

function RotationList() {
  const { rotations, isLoading, isError, error, refetch } = useRotations();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refetch()}>Refresh</button>
      <ul>
        {rotations.map(r => <li key={r.id}>{r.name}</li>)}
      </ul>
    </div>
  );
}
```

**Changes:**
- ✅ `loading` → `isLoading`
- ✅ Added `refetch` for manual refresh
- ✅ Added `isFetching` for background refetch indicator
- ✅ Backward compatible: `loading` still available

### useUserTasks

**Before (Old Hook):**
```tsx
import { useUserTasks } from '@/lib/hooks/useUserTasks';

function TaskList() {
  const { tasks, loading, error, refresh } = useUserTasks();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  const handleRefresh = async () => {
    await refresh();
  };

  return (
    <div>
      <button onClick={handleRefresh}>Refresh</button>
      <ul>
        {tasks.map(t => <li key={t.id}>{t.note}</li>)}
      </ul>
    </div>
  );
}
```

**After (React Query):**
```tsx
import { useUserTasks } from '@/lib/react-query/hooks';

function TaskList() {
  const { tasks, isLoading, isError, error, refetch, isFetching } = useUserTasks();

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={() => refetch()} disabled={isFetching}>
        {isFetching ? 'Refreshing...' : 'Refresh'}
      </button>
      <ul>
        {tasks.map(t => <li key={t.id}>{t.note}</li>)}
      </ul>
    </div>
  );
}
```

**Changes:**
- ✅ `loading` → `isLoading`
- ✅ `refresh` → `refetch` (more standard)
- ✅ Added `isFetching` for background refetch state
- ✅ Backward compatible: `loading` and `refresh` still available

## Mutation Examples

### Creating Tasks with Optimistic Updates

```tsx
import { useCreateTask } from '@/lib/react-query/hooks';

function CreateTaskForm() {
  const { mutate, isPending, isError, error } = useCreateTask();

  const handleSubmit = (formData) => {
    mutate({
      userId: currentUser.uid,
      rotationId: 'rotation123',
      itemId: 'item456',
      count: 5,
      requiredCount: 10,
      note: formData.note,
    }, {
      onSuccess: () => {
        console.log('Task created successfully');
        // UI already updated optimistically!
      },
      onError: (err) => {
        console.error('Failed to create task:', err);
        // Optimistic update automatically rolled back
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="note" placeholder="Task note" />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Task'}
      </button>
      {isError && <div>Error: {error.message}</div>}
    </form>
  );
}
```

### Deleting Tasks with Optimistic Updates

```tsx
import { useDeleteTask } from '@/lib/react-query/hooks';

function TaskItem({ task }) {
  const { mutate, isPending } = useDeleteTask();

  const handleDelete = () => {
    mutate(
      { taskId: task.id, userId: task.userId },
      {
        onSuccess: () => {
          console.log('Task deleted');
        },
      }
    );
  };

  return (
    <div>
      <span>{task.note}</span>
      <button onClick={handleDelete} disabled={isPending}>
        {isPending ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}
```

### Using Combined Mutations

```tsx
import { useTaskMutations } from '@/lib/react-query/hooks';

function TaskManager() {
  const { createTask, deleteTask, isPending } = useTaskMutations();

  return (
    <div>
      <button
        onClick={() => createTask.mutate({ ... })}
        disabled={isPending}
      >
        Create Task
      </button>

      <button
        onClick={() => deleteTask.mutate({ taskId: '123', userId: 'user1' })}
        disabled={isPending}
      >
        Delete Task
      </button>
    </div>
  );
}
```

## Manual Cache Invalidation

When you need to manually invalidate queries (e.g., after an external update):

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';

function SomeComponent() {
  const queryClient = useQueryClient();

  const handleAction = async () => {
    // Do something...

    // Invalidate all task queries
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

    // Invalidate specific user's tasks
    await queryClient.invalidateQueries({ queryKey: queryKeys.tasks.byUser('user123') });

    // Invalidate all rotation queries
    await queryClient.invalidateQueries({ queryKey: queryKeys.rotations.all });
  };

  return <button onClick={handleAction}>Do Action</button>;
}
```

## Advanced: Prefetching

Prefetch data before it's needed for better UX:

```tsx
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/react-query/keys';
import { fetchUserTasks } from '@/lib/firebase/db';

function TasksNavLink({ userId }) {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    // Prefetch tasks when user hovers over link
    queryClient.prefetchQuery({
      queryKey: queryKeys.tasks.byUser(userId),
      queryFn: () => fetchUserTasks(userId),
    });
  };

  return (
    <Link href="/tasks" onMouseEnter={handleMouseEnter}>
      View Tasks
    </Link>
  );
}
```

## DevTools

React Query DevTools are automatically enabled in development mode (see bottom of the page).

- View all active queries and their cache status
- Inspect query data and errors
- Manually trigger refetches
- Monitor mutation states
- Debug stale/fresh data states

## Configuration

Default configuration in `lib/react-query/provider.tsx`:

```ts
{
  queries: {
    staleTime: 5 * 60 * 1000,        // 5 minutes (when data becomes stale)
    gcTime: 10 * 60 * 1000,          // 10 minutes (cache garbage collection)
    retry: 2,                         // Retry failed queries twice
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
    refetchOnWindowFocus: true,       // Refetch when window regains focus
    refetchOnMount: false,            // Don't refetch if data is fresh
    refetchOnReconnect: true,         // Refetch after reconnect
  },
  mutations: {
    retry: 1,                         // Retry mutations once
    retryDelay: 1000,
  },
}
```

### Per-Hook Overrides

Each hook can override defaults:

```ts
useQuery({
  queryKey: queryKeys.tasks.byUser(userId),
  queryFn: () => fetchUserTasks(userId),
  staleTime: 2 * 60 * 1000,    // Override: 2 minutes instead of 5
  refetchOnWindowFocus: true,   // Keep default
});
```

## Migration Checklist

- [x] Install `@tanstack/react-query` and devtools
- [x] Set up `QueryClientProvider` in root layout
- [x] Create query keys factory (`lib/react-query/keys.ts`)
- [x] Migrate `useCurrentUserProfile`
- [x] Migrate `useRotations`
- [x] Migrate `useUserTasks`
- [x] Create `useCreateTask` with optimistic updates
- [x] Create `useDeleteTask` with optimistic updates
- [ ] Update UI components to use new hooks
- [ ] Test all functionality
- [ ] Remove old hooks (optional, can keep for gradual migration)

## Benefits Summary

✅ **Automatic Caching**: No more manual state management
✅ **Background Refetching**: Data stays fresh automatically
✅ **Optimistic Updates**: Instant UI feedback
✅ **Error Handling**: Consistent error states
✅ **Retry Logic**: Built-in exponential backoff
✅ **DevTools**: Visual debugging
✅ **Type Safety**: Full TypeScript support
✅ **Performance**: Reduces unnecessary renders
✅ **DX**: Less boilerplate code

## Next Steps

1. Gradually migrate other Firebase hooks to React Query
2. Add prefetching for commonly accessed data
3. Implement pagination with `useInfiniteQuery`
4. Add polling for real-time-like updates
5. Explore `useSuspense` for simplified loading states

## Resources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Query Keys Guide](https://tkdodo.eu/blog/effective-react-query-keys)
- [React Query Best Practices](https://tkdodo.eu/blog/practical-react-query)
