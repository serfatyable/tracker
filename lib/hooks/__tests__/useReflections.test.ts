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

vi.mock('firebase/firestore', () => ({
  ...firestoreMocks,
  doc: (...args: any[]) => firestoreMocks.doc(...args),
  setDoc: (...args: any[]) => firestoreMocks.setDoc(...args),
  getFirestore: (...args: any[]) => firestoreMocks.getFirestore(...args),
  serverTimestamp: () => 'server-ts',
}));

vi.mock('../../firebase/client', () => ({
  getFirebaseApp: () => ({ app: 'test' }),
}));

describe('submitReflection', () => {
  beforeEach(() => {
    firestoreMocks.setDoc.mockClear();
    firestoreMocks.doc.mockClear();
    firestoreMocks.getFirestore.mockClear();
  });

  it('creates resident reflections using the legacy id format', async () => {
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
});
