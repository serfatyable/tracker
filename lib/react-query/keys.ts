/**
 * Query Key Factory
 *
 * Centralized query key management for consistent cache invalidation
 * and type-safe query key generation.
 *
 * Key Structure:
 * - Level 1: Entity type (e.g., ['users'], ['rotations'], ['tasks'])
 * - Level 2: Operation (e.g., ['users', 'profile'], ['users', 'list'])
 * - Level 3: Filters/IDs (e.g., ['users', 'profile', userId], ['tasks', 'list', { userId }])
 *
 * This hierarchical structure allows for granular invalidation:
 * - queryClient.invalidateQueries({ queryKey: ['users'] }) invalidates ALL user queries
 * - queryClient.invalidateQueries({ queryKey: ['users', 'profile'] }) invalidates ALL user profiles
 * - queryClient.invalidateQueries({ queryKey: ['users', 'profile', '123'] }) invalidates specific profile
 *
 * @see https://tkdodo.eu/blog/effective-react-query-keys
 */

export const queryKeys = {
  /**
   * User-related queries
   */
  users: {
    all: ['users'] as const,
    profiles: () => [...queryKeys.users.all, 'profile'] as const,
    profile: (userId: string) => [...queryKeys.users.profiles(), userId] as const,
    currentProfile: () => [...queryKeys.users.profiles(), 'current'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters?: { role?: string; status?: string }) =>
      [...queryKeys.users.lists(), filters] as const,
    byRole: (role: string) => [...queryKeys.users.lists(), { role }] as const,
    pending: () => [...queryKeys.users.lists(), { status: 'pending' }] as const,
  },

  /**
   * Rotation-related queries
   */
  rotations: {
    all: ['rotations'] as const,
    lists: () => [...queryKeys.rotations.all, 'list'] as const,
    list: () => [...queryKeys.rotations.lists()] as const,
    details: () => [...queryKeys.rotations.all, 'detail'] as const,
    detail: (rotationId: string) => [...queryKeys.rotations.details(), rotationId] as const,
    items: () => [...queryKeys.rotations.all, 'items'] as const,
    itemsByRotation: (rotationId: string) => [...queryKeys.rotations.items(), rotationId] as const,
    nodes: (rotationId: string) => [...queryKeys.rotations.all, 'nodes', rotationId] as const,
    coverage: (rotationId: string) =>
      [...queryKeys.rotations.all, 'coverage', rotationId] as const,
    activeRotations: (userId: string) =>
      [...queryKeys.rotations.all, 'active', userId] as const,
  },

  /**
   * Task-related queries
   */
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: { userId?: string; status?: string; rotationId?: string }) =>
      [...queryKeys.tasks.lists(), filters] as const,
    byUser: (userId: string) => [...queryKeys.tasks.lists(), { userId }] as const,
    byRotation: (rotationId: string) => [...queryKeys.tasks.lists(), { rotationId }] as const,
    pending: (userId?: string) =>
      [...queryKeys.tasks.lists(), { status: 'pending', userId }] as const,
    detail: (taskId: string) => [...queryKeys.tasks.all, 'detail', taskId] as const,
    counts: () => [...queryKeys.tasks.all, 'count'] as const,
    pendingCount: (userId?: string) => [...queryKeys.tasks.counts(), 'pending', userId] as const,
  },

  /**
   * Petition-related queries
   */
  petitions: {
    all: ['petitions'] as const,
    lists: () => [...queryKeys.petitions.all, 'list'] as const,
    list: (filters?: { userId?: string; rotationId?: string; status?: string }) =>
      [...queryKeys.petitions.lists(), filters] as const,
    byUser: (userId: string) => [...queryKeys.petitions.lists(), { userId }] as const,
    byRotation: (rotationId: string) => [...queryKeys.petitions.lists(), { rotationId }] as const,
    pending: () => [...queryKeys.petitions.lists(), { status: 'pending' }] as const,
    counts: () => [...queryKeys.petitions.all, 'count'] as const,
    pendingCount: () => [...queryKeys.petitions.counts(), 'pending'] as const,
  },

  /**
   * Assignment-related queries
   */
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (filters?: { userId?: string; active?: boolean }) =>
      [...queryKeys.assignments.lists(), filters] as const,
    active: () => [...queryKeys.assignments.lists(), { active: true }] as const,
    byUser: (userId: string) => [...queryKeys.assignments.lists(), { userId }] as const,
  },

  /**
   * Reflection-related queries
   */
  reflections: {
    all: ['reflections'] as const,
    lists: () => [...queryKeys.reflections.all, 'list'] as const,
    list: (filters?: { userId?: string; rotationId?: string }) =>
      [...queryKeys.reflections.lists(), filters] as const,
    byUser: (userId: string) => [...queryKeys.reflections.lists(), { userId }] as const,
    templates: () => [...queryKeys.reflections.all, 'templates'] as const,
  },

  /**
   * On-call schedule queries
   */
  onCall: {
    all: ['onCall'] as const,
    lists: () => [...queryKeys.onCall.all, 'list'] as const,
    byDate: (date: string) => [...queryKeys.onCall.lists(), { date }] as const,
    byUser: (userId: string) => [...queryKeys.onCall.lists(), { userId }] as const,
    today: () => [...queryKeys.onCall.lists(), { date: 'today' }] as const,
    upcoming: (userId: string) => [...queryKeys.onCall.lists(), 'upcoming', userId] as const,
    stats: () => [...queryKeys.onCall.all, 'stats'] as const,
  },

  /**
   * Morning meeting queries
   */
  meetings: {
    all: ['meetings'] as const,
    lists: () => [...queryKeys.meetings.all, 'list'] as const,
    byDate: (date: string) => [...queryKeys.meetings.lists(), { date }] as const,
    upcoming: () => [...queryKeys.meetings.lists(), 'upcoming'] as const,
  },

  /**
   * Dashboard and analytics queries
   */
  dashboard: {
    all: ['dashboard'] as const,
    tutor: (userId: string) => [...queryKeys.dashboard.all, 'tutor', userId] as const,
    tutorMetrics: (userId: string) =>
      [...queryKeys.dashboard.all, 'tutor', 'metrics', userId] as const,
    resident: (userId: string) => [...queryKeys.dashboard.all, 'resident', userId] as const,
    residentProgress: (userId: string) =>
      [...queryKeys.dashboard.all, 'resident', 'progress', userId] as const,
    recentActivity: () => [...queryKeys.dashboard.all, 'activity'] as const,
  },

  /**
   * Exam queries
   */
  exams: {
    all: ['exams'] as const,
    lists: () => [...queryKeys.exams.all, 'list'] as const,
    list: (filters?: { userId?: string }) => [...queryKeys.exams.lists(), filters] as const,
  },
} as const;

/**
 * Type-safe query key inference
 * Allows TypeScript to infer the exact type of query keys
 */
export type QueryKeys = typeof queryKeys;

/**
 * Helper to get all keys for a specific entity type
 * Useful for invalidating all queries of a certain type
 *
 * @example
 * queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all })
 */
export function getEntityKeys(entity: keyof typeof queryKeys) {
  return queryKeys[entity].all;
}
