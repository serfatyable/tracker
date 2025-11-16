import { NextRequest } from 'next/server';
import { vi, describe, it, expect, beforeEach } from 'vitest';

import { POST } from '../rotation-petitions/route';

// Mock Firebase client
vi.mock('../../../lib/firebase/client', () => ({ getFirebaseApp: () => ({}) }));

// Mock Firebase Admin SDK
vi.mock('../../../lib/firebase/admin-sdk', () => ({
  getAdminApp: () => ({}),
}));

// Mock auth verification
vi.mock('../../../lib/api/auth', () => ({
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

// Mock data stores
let rotationPetitions: any[] = [];
let assignments: any[] = [];

// Mock firebase-admin/firestore
vi.mock('firebase-admin/firestore', async () => {
  const actual = await vi.importActual<any>('firebase-admin/firestore');
  return {
    ...actual,
    getFirestore: () => ({
      collection: (name: string) => ({
        where: (field: string, op: string, value: any) => ({
          where: (field2: string, op2: string, value2: any) => ({
            where: (field3: string, op3: string, value3: any) => ({
              limit: () => ({
                get: async () => {
                  if (name === 'rotationPetitions') {
                    const filtered = rotationPetitions.filter(
                      (p) =>
                        p.residentId === value && p.rotationId === value2 && p.status === value3,
                    );
                    return { empty: filtered.length === 0, docs: filtered };
                  }
                  return { empty: true, docs: [] };
                },
              }),
            }),
            limit: () => ({
              get: async () => {
                if (name === 'assignments') {
                  const filtered = assignments.filter(
                    (a) => a.residentId === value && a.status === value2,
                  );
                  return { empty: filtered.length === 0, docs: filtered };
                }
                return { empty: true, docs: [] };
              },
            }),
          }),
        }),
        add: async (data: any) => {
          const id = `petition_${Date.now()}`;
          rotationPetitions.push({ id, ...data });
          return { id };
        },
      }),
    }),
    FieldValue: {
      serverTimestamp: () => new Date(),
    },
  };
});

function makeRequest(body: any, uid: string | null = 'resident123') {
  const headers = new Headers({ 'content-type': 'application/json' });
  if (uid) {
    headers.set('x-user-uid', uid);
  }

  return new NextRequest('http://localhost/api/rotation-petitions', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  } as any);
}

describe('POST /api/rotation-petitions', () => {
  beforeEach(() => {
    // Reset mock data before each test
    rotationPetitions = [];
    assignments = [];
  });

  describe('Authentication', () => {
    it('returns 401 when no auth token provided', async () => {
      const req = makeRequest({ rotationId: 'rot1', type: 'activate' }, null);
      const res = await POST(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('returns 400 when request body is invalid JSON', async () => {
      const req = new NextRequest('http://localhost/api/rotation-petitions', {
        method: 'POST',
        headers: new Headers({
          'content-type': 'application/json',
          'x-user-uid': 'resident123',
        }),
        body: 'invalid-json{',
      } as any);

      const res = await POST(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Invalid JSON payload.');
    });

    it('returns 400 when rotationId is missing', async () => {
      const req = makeRequest({ type: 'activate' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Rotation ID is required.');
    });

    it('returns 400 when rotationId is empty string', async () => {
      const req = makeRequest({ rotationId: '   ', type: 'activate' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Rotation ID is required.');
    });

    it('returns 400 when type is missing', async () => {
      const req = makeRequest({ rotationId: 'rot1' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Petition type must be either "activate" or "finish".');
    });

    it('returns 400 when type is invalid', async () => {
      const req = makeRequest({ rotationId: 'rot1', type: 'invalid' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Petition type must be either "activate" or "finish".');
    });
  });

  describe('Business Logic', () => {
    it('creates activate petition when no active assignments exist', async () => {
      const req = makeRequest({
        rotationId: 'rot1',
        type: 'activate',
        reason: 'Starting new rotation',
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBeTruthy();
      expect(json.id).toMatch(/^petition_/);
    });

    it('creates finish petition successfully', async () => {
      const req = makeRequest({
        rotationId: 'rot1',
        type: 'finish',
        reason: 'Completed rotation',
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBeTruthy();
    });

    it('returns 400 when resident already has pending petition for same rotation', async () => {
      // Add existing pending petition
      rotationPetitions.push({
        id: 'existing',
        residentId: 'resident123',
        rotationId: 'rot1',
        status: 'pending',
      });

      const req = makeRequest({
        rotationId: 'rot1',
        type: 'activate',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('already have a pending petition');
    });

    it('returns 400 when trying to activate while having active assignment', async () => {
      // Add active assignment
      assignments.push({
        id: 'assign1',
        residentId: 'resident123',
        status: 'active',
      });

      const req = makeRequest({
        rotationId: 'rot1',
        type: 'activate',
      });

      const res = await POST(req);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.error).toContain('cannot have two rotations active');
    });

    it('allows finish petition even with active assignment', async () => {
      // Add active assignment
      assignments.push({
        id: 'assign1',
        residentId: 'resident123',
        status: 'active',
      });

      const req = makeRequest({
        rotationId: 'rot1',
        type: 'finish',
      });

      const res = await POST(req);
      expect(res.status).toBe(201);
    });

    it('trims whitespace from reason field', async () => {
      const req = makeRequest({
        rotationId: 'rot1',
        type: 'activate',
        reason: '  My reason  ',
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      // Verify the petition was created with trimmed reason
      expect(rotationPetitions.length).toBe(1);
      expect(rotationPetitions[0].reason).toBe('My reason'); // API trims the reason
    });

    it('handles missing reason field', async () => {
      const req = makeRequest({
        rotationId: 'rot1',
        type: 'activate',
      });

      const res = await POST(req);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.id).toBeTruthy();
    });
  });

  describe('Data Types', () => {
    it('handles non-string rotationId gracefully', async () => {
      const req = makeRequest({ rotationId: 123, type: 'activate' });
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe('Rotation ID is required.');
    });

    it('handles non-string reason gracefully', async () => {
      const req = makeRequest({
        rotationId: 'rot1',
        type: 'activate',
        reason: { invalid: 'object' },
      });

      const res = await POST(req);
      expect(res.status).toBe(201); // Should still create petition with empty reason
    });
  });
});
