import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { verifyAuthToken, createAuthErrorResponse } from '../../../../lib/api/auth';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { buildOnCallIcs } from '../../../../lib/ics/buildOnCallIcs';

/**
 * Export on-call schedule as ICS calendar file
 *
 * SECURITY: Requires authentication via Firebase ID token
 * Returns only the authenticated user's assignments
 *
 * @route GET /api/ics/on-call
 * @auth Required - Any authenticated user
 */
export async function GET(req: NextRequest) {
  // ✅ SECURE: Verify Firebase ID token
  try {
    const auth = await verifyAuthToken(req);
    const uid = auth.uid;

    const app = getFirebaseApp();
    const db = getFirestore(app);

    // Verify user is approved
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) {
      return new NextResponse('User not found', { status: 404 });
    }

    const userData = userSnap.data() as any;
    if (userData.status !== 'active' && userData.status !== 'approved') {
      return new NextResponse('Account pending approval', { status: 403 });
    }

    const now = new Date();
    const col = collection(db, 'onCallAssignments');
    const q = query(
      col,
      where('userId', '==', uid),
      where('endAt', '>=', now),
      orderBy('userId'),
      orderBy('startAt'),
    );
    const snap = await getDocs(q);
    const assignments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const ics = buildOnCallIcs(assignments as any, userData.fullName || userData.email);
    return new NextResponse(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="on-call.ics"',
        'cache-control': 'private, max-age=300',
      },
    });
  } catch (error) {
    // Handle authentication errors
    if (
      error instanceof Error &&
      (error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('Forbidden'))
    ) {
      return createAuthErrorResponse(error);
    }
    // Handle other errors
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to generate calendar',
      { status: 500 },
    );
  }
}
