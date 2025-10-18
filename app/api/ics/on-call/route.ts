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
 * Returns only the authenticated user's shifts if personal=true
 *
 * @route GET /api/ics/on-call?personal=true
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

    // Check if personal calendar is requested
    const { searchParams } = new URL(req.url);
    const personal = searchParams.get('personal') === 'true';
    const userName = userData.fullName || userData.email;

    // Fetch all on-call shifts
    const now = new Date();
    now.setMonth(now.getMonth() - 1); // Include past month
    const startKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    
    const col = collection(db, 'onCallShifts');
    const q = query(
      col,
      where('dateKey', '>=', startKey),
      orderBy('dateKey', 'asc')
    );
    const snap = await getDocs(q);
    
    // Filter shifts for current user if personal
    const myShifts: Array<{ date: Date; shiftType: string; dateKey: string }> = [];
    snap.docs.forEach((d) => {
      const data = d.data();
      const shifts = data.shifts || {};
      Object.entries(shifts).forEach(([shiftType, residentName]) => {
        if (personal && !String(residentName).includes(userName)) {
          return; // Skip if not user's shift
        }
        myShifts.push({
          date: data.date.toDate(),
          shiftType,
          dateKey: data.dateKey
        });
      });
    });

    const ics = buildOnCallIcs(myShifts as any, userName);
    return new NextResponse(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="on-call${personal ? '-my-shifts' : ''}.ics"`,
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
    console.error('ICS generation error:', error);
    return new NextResponse(
      error instanceof Error ? error.message : 'Failed to generate calendar',
      { status: 500 },
    );
  }
}
