import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import { buildOnCallIcs } from '@/lib/ics/buildOnCallIcs';
import { isValidTokenFormat } from '@/lib/ics/tokens';
import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/middleware/rateLimit';

/**
 * Export user's on-call schedule as ICS via token
 *
 * SECURITY: Token-based authentication for calendar subscription URLs
 * This uses a persistent token stored in user settings for calendar apps
 * that cannot use Bearer tokens (Google Calendar, Apple Calendar, etc.)
 *
 * SECURITY: Rate limiting prevents token enumeration attacks
 * Limit: 100 requests per hour per IP address
 *
 * Query params:
 * - personal: 'true' | 'false' (default: 'true') - only user's shifts vs all shifts
 *
 * @route GET /api/ics/on-call/[token]
 * @auth Token-based (for calendar subscriptions)
 */
export async function GET(req: NextRequest) {
  try {
    // ✅ RATE LIMITING: Prevent token enumeration attacks
    const identifier = getClientIdentifier(req);
    const rateLimitResponse = await checkRateLimit(identifier, rateLimiters?.tokenAuth ?? null);
    if (rateLimitResponse) {
      return rateLimitResponse; // 429 Too Many Requests
    }

    const app = getFirebaseApp();
    const db = getFirestore(app);
    const url = new URL(req.url);
    const segments = url.pathname.split('/').filter(Boolean);
    const token = segments[segments.length - 1];

    // Validate token format (basic check)
    if (!isValidTokenFormat(token)) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    // Find user by icsToken
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('settings.icsToken', '==', token)),
    );
    const userDoc = usersSnap.docs[0];

    if (!userDoc) {
      // Use generic error message to prevent token enumeration
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userDoc.data() as any;
    const uid = userDoc.id;

    // Verify user is active
    if (user.status !== 'active' && user.status !== 'approved') {
      return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    }

    // Check if personal calendar is requested (default: true for token-based)
    const { searchParams } = url;
    const personal = searchParams.get('personal') !== 'false'; // Default to personal

    // Fetch all on-call days
    const now = new Date();
    now.setMonth(now.getMonth() - 1); // Include past month
    const startKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

    const col = collection(db, 'onCallDays');
    const q = query(col, where('dateKey', '>=', startKey), orderBy('dateKey', 'asc'));
    const snap = await getDocs(q);

    // Build shifts, filtering by uid when personal=true
    const myShifts: Array<{ date: Date; shiftType: string; dateKey: string }> = [];
    snap.docs.forEach((d) => {
      const data = d.data() as any;
      const stations = (data.stations || {}) as Record<
        string,
        { userId: string; userDisplayName: string }
      >;
      Object.entries(stations).forEach(([stationKey, entry]) => {
        if (personal && entry.userId !== uid) return;
        myShifts.push({ date: data.date.toDate(), shiftType: stationKey, dateKey: data.dateKey });
      });
    });

    const ics = buildOnCallIcs(myShifts as any, user.fullName || user.email);

    return new NextResponse(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': `attachment; filename="on-call${personal ? '-my-shifts' : ''}.ics"`,
        // Private cache since this is user-specific data
        'cache-control': 'private, max-age=300',
      },
    });
  } catch (error) {
    // Generic error message to avoid leaking information
    console.error('Error generating on-call ICS:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
