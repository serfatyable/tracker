import { describe, expect, it, beforeEach, vi } from 'vitest';

import { submitReflection } from '../useReflections';

const firestoreMocks = vi.hoisted(() => {
  return {
    getFirestore: vi.fn(() => ({ name: 'db' })),
    doc: vi.fn(() => ({ path: 'mock/reflection/doc' })),
    setDoc: vi.fn(),
    collection: vi.fn(),
    getDoc: vi.fn(),
    getDocs: vi.fn(),
    orderBy: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
  };
});

const authMocks = vi.hoisted(() => ({
  currentUser: { uid: 'default-user' } as { uid: string } | null,
}));

vi.mock('firebase/firestore', () => ({
  ...firestoreMocks,
  doc: (...args: unknown[]) =>
    firestoreMocks.doc(...(args as Parameters<typeof firestoreMocks.doc>)),
  setDoc: (...args: unknown[]) =>
    firestoreMocks.setDoc(...(args as Parameters<typeof firestoreMocks.setDoc>)),
  getFirestore: (...args: unknown[]) =>
    firestoreMocks.getFirestore(...(args as Parameters<typeof firestoreMocks.getFirestore>)),
  serverTimestamp: () => 'server-ts',
}));

vi.mock('../../firebase/client', () => ({
  getFirebaseApp: () => ({ app: 'test' }),
}));

vi.mock('firebase/auth', () => ({
  getAuth: () => authMocks,
}));

describe('submitReflection', () => {
  beforeEach(() => {
    firestoreMocks.setDoc.mockClear();
    firestoreMocks.doc.mockClear();
    firestoreMocks.getFirestore.mockClear();
    authMocks.currentUser = { uid: 'default-user' };
  });

  it('creates resident reflections using the legacy id format', async () => {
    authMocks.currentUser = { uid: 'resident-123' };
    await submitReflection({
      taskOccurrenceId: 'task-1',
      taskType: 'Task',
      templateKey: 'resident-default',
      templateVersion: 1,
      authorId: 'resident-123',
      authorRole: 'resident',
      residentId: 'resident-123',
      tutorId: 'tutor-456',
      answers: { p1: 'Answer' },
    });

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      expect.anything(),
      'reflections',
      'task-1_resident-123',
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
  });

  it('includes the resident id in tutor reflection ids to keep them unique', async () => {
    authMocks.currentUser = { uid: 'tutor-456' };
    await submitReflection({
      taskOccurrenceId: 'task-1',
      taskType: 'Task',
      templateKey: 'tutor-default',
      templateVersion: 1,
      authorId: 'tutor-456',
      authorRole: 'tutor',
      residentId: 'resident-789',
      tutorId: 'tutor-456',
      answers: { p1: 'Tutor answer' },
    });

    expect(firestoreMocks.doc).toHaveBeenCalledWith(
      expect.anything(),
      'reflections',
      'task-1_tutor-456_resident-789',
    );
    expect(firestoreMocks.setDoc).toHaveBeenCalledTimes(1);
  });

  it('throws when no authenticated user is available', async () => {
    authMocks.currentUser = null;
    await expect(
      submitReflection({
        taskOccurrenceId: 'task-1',
        taskType: 'Task',
        templateKey: 'resident-default',
        templateVersion: 1,
        authorId: 'resident-123',
        authorRole: 'resident',
        residentId: 'resident-123',
        tutorId: 'tutor-456',
        answers: { p1: 'Answer' },
      }),
    ).rejects.toThrow('auth/missing-current-user');
  });
});
