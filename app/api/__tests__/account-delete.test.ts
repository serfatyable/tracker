import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { DELETE } from '../account/delete/route';

// Mock Firebase Admin SDK
let deletedAuthUsers: string[] = [];
let deletedDocs: Array<{ collection: string; id: string }> = [];
let batchCommits = 0;

// Mock data stores
let tasks: any[] = [];
let cases: any[] = [];
let users: any[] = [];

// Mock auth verification
vi.mock('@/lib/api/auth', () => ({
  verifyAuthToken: vi.fn(async (req: NextRequest) => {
    const uid = req.headers.get('x-user-uid');
    if (!uid) {
      throw new Error('auth/missing-token');
    }
    return { uid };
  }),
  createAuthErrorResponse: vi.fn((error: any) => {
    return new Response(JSON.stringify({ error: error.message || 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
}));

// Mock Firebase Admin SDK
vi.mock('@/lib/firebase/admin-sdk', () => ({
  getAdminApp: () => ({}),
}));

// Mock firebase-admin/auth
vi.mock('firebase-admin/auth', () => ({
  getAuth: () => ({
    deleteUser: vi.fn(async (uid: string) => {
      const index = deletedAuthUsers.findIndex((u) => u === uid);
      if (index >= 0) {
        const error: any = new Error('User not found');
        error.code = 'auth/user-not-found';
        throw error;
      }
      deletedAuthUsers.push(uid);
    }),
  }),
}));

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({
    collection: (name: string) => ({
      where: (field: string, op: string, value: any) => ({
        limit: (size: number) => ({
          get: async () => {
            let docs: any[] = [];

            if (name === 'tasks' && field === 'userId') {
              docs = tasks
                .filter((t) => t.userId === value)
                .slice(0, size)
                .map((t) => ({
                  ref: { collection: 'tasks', id: t.id },
                  data: () => t,
                }));
            } else if (name === 'cases' && field === 'userId') {
              docs = cases
                .filter((c) => c.userId === value)
                .slice(0, size)
                .map((c) => ({
                  ref: { collection: 'cases', id: c.id },
                  data: () => c,
                }));
            } else if (name === 'cases' && field === 'residentId') {
              docs = cases
                .filter((c) => c.residentId === value)
                .slice(0, size)
                .map((c) => ({
                  ref: { collection: 'cases', id: c.id },
                  data: () => c,
                }));
            }

            return {
              empty: docs.length === 0,
              size: docs.length,
              docs,
            };
          },
        }),
      }),
      doc: (uid: string) => ({
        delete: async () => {
          const userIndex = users.findIndex((u) => u.id === uid);
          if (userIndex < 0) {
            const error: any = new Error('Not found');
            error.code = 5; // NOT_FOUND error code
            throw error;
          }
          deletedDocs.push({ collection: 'users', id: uid });
          users.splice(userIndex, 1);
        },
      }),
    }),
    batch: () => ({
      delete: (ref: any) => {
        deletedDocs.push(ref);

        // Simulate actual deletion from mock stores
        if (ref.collection === 'tasks') {
          const index = tasks.findIndex((t) => t.id === ref.id);
          if (index >= 0) tasks.splice(index, 1);
        } else if (ref.collection === 'cases') {
          const index = cases.findIndex((c) => c.id === ref.id);
          if (index >= 0) cases.splice(index, 1);
        }
      },
      commit: async () => {
        batchCommits++;
      },
    }),
  }),
}));

function makeRequest(uid: string | null = 'user123') {
  const headers = new Headers();
  if (uid) {
    headers.set('x-user-uid', uid);
  }

  return new NextRequest('http://localhost/api/account/delete', {
    method: 'DELETE',
    headers,
  } as any);
}

describe('DELETE /api/account/delete', () => {
  beforeEach(() => {
    // Reset mock data before each test
    deletedAuthUsers = [];
    deletedDocs = [];
    batchCommits = 0;
    tasks = [];
    cases = [];
    users = [];
  });

  describe('Authentication', () => {
    it('returns 401 when no auth token provided', async () => {
      const req = makeRequest(null);
      const res = await DELETE(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBeTruthy();
    });

    it('deletes account for authenticated user', async () => {
      users.push({ id: 'user123', email: 'user@test.com' });

      const req = makeRequest('user123');
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });
  });

  describe('Data Deletion', () => {
    it('deletes user tasks', async () => {
      tasks.push(
        { id: 'task1', userId: 'user123' },
        { id: 'task2', userId: 'user123' },
        { id: 'task3', userId: 'other' },
      );
      users.push({ id: 'user123' });

      const req = makeRequest('user123');
      await DELETE(req);

      // Check that user's tasks were deleted
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('task3'); // Only other user's task remains
      expect(deletedDocs.filter((d) => d.collection === 'tasks').length).toBe(2);
    });

    it('deletes user cases by userId', async () => {
      cases.push(
        { id: 'case1', userId: 'user123' },
        { id: 'case2', userId: 'user123' },
        { id: 'case3', userId: 'other' },
      );
      users.push({ id: 'user123' });

      const req = makeRequest('user123');
      await DELETE(req);

      // User's cases should be deleted
      expect(cases.length).toBe(1);
      expect(cases[0].id).toBe('case3');
    });

    it('deletes user cases by residentId', async () => {
      cases.push(
        { id: 'case1', residentId: 'user123' },
        { id: 'case2', residentId: 'user123' },
        { id: 'case3', residentId: 'other' },
      );
      users.push({ id: 'user123' });

      const req = makeRequest('user123');
      await DELETE(req);

      // Resident's cases should be deleted
      expect(cases.length).toBe(1);
      expect(cases[0].id).toBe('case3');
    });

    it('deletes user profile document', async () => {
      users.push({ id: 'user123', email: 'user@test.com' });

      const req = makeRequest('user123');
      await DELETE(req);

      expect(users.length).toBe(0);
      expect(deletedDocs.some((d) => d.collection === 'users' && d.id === 'user123')).toBe(true);
    });

    it('deletes Firebase Auth user', async () => {
      users.push({ id: 'user123' });

      const req = makeRequest('user123');
      await DELETE(req);

      expect(deletedAuthUsers).toContain('user123');
    });

    it('handles batch deletion for large datasets', async () => {
      // Create 300 tasks (more than batch size of 250)
      for (let i = 0; i < 300; i++) {
        tasks.push({ id: `task${i}`, userId: 'user123' });
      }
      users.push({ id: 'user123' });

      const req = makeRequest('user123');
      await DELETE(req);

      // Should have made 2 batch commits (250 + 50)
      expect(batchCommits).toBeGreaterThanOrEqual(2);
      expect(tasks.length).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('succeeds even when user document is already deleted', async () => {
      // User document doesn't exist, but auth user does
      const req = makeRequest('user123');
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('succeeds even when auth user is already deleted', async () => {
      users.push({ id: 'user123' });
      // Pre-delete the auth user
      deletedAuthUsers.push('user123');

      const req = makeRequest('user123');
      const res = await DELETE(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
    });

    it('deletes all data types in correct order', async () => {
      tasks.push({ id: 'task1', userId: 'user123' });
      cases.push({ id: 'case1', userId: 'user123' });
      cases.push({ id: 'case2', residentId: 'user123' });
      users.push({ id: 'user123' });

      const req = makeRequest('user123');
      await DELETE(req);

      // All data should be deleted
      expect(tasks.length).toBe(0);
      expect(cases.length).toBe(0);
      expect(users.length).toBe(0);
      expect(deletedAuthUsers).toContain('user123');
    });
  });

  describe('Idempotency', () => {
    it('can be called multiple times safely', async () => {
      users.push({ id: 'user123' });

      const req1 = makeRequest('user123');
      const res1 = await DELETE(req1);
      expect(res1.status).toBe(200);

      // Call again - should still succeed even though user is deleted
      const req2 = makeRequest('user123');
      const res2 = await DELETE(req2);
      expect(res2.status).toBe(200);
    });
  });
});
