import { NextRequest } from 'next/server';
import { vi, describe, it, expect } from 'vitest';
import { POST } from '../on-call/import/route';

vi.mock('../../../lib/firebase/client', () => ({ getFirebaseApp: () => ({}) }));

vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual<any>('firebase/firestore');
  return {
    ...actual,
    getFirestore: () => ({}),
    getDoc: async () => ({ exists: () => true, data: () => ({ role: 'admin', status: 'approved' }) }),
    collection: () => ({}),
    getDocs: async () => ({ docs: [], size: 0 }),
    query: () => ({}),
    where: () => ({}),
  };
});

function makeReq(body: string) {
  return new NextRequest('http://localhost/api/on-call/import?dryRun=1', {
    method: 'POST',
    headers: new Headers({ 'content-type': 'text/plain', 'x-user-uid': 'admin' }),
    body,
  } as any);
}

describe('OnCallImport dry run', () => {
  it('returns preview for simple csv', async () => {
    const csv = 'יום,תאריך,ת.חדר ניתוח\nא,01/11/2025,Dr. Jane';
    const res = await POST(makeReq(csv));
    const json = await (res as any).json();
    expect((res as any).status).toBe(200);
    expect(json.preview.assignments).toBeGreaterThan(0);
  });
});


