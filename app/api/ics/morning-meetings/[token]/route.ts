import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { NextResponse } from 'next/server';

import { getFirebaseApp } from '../../../../../lib/firebase/client';
import { buildIcsCalendar, simpleHash } from '../../../../../lib/ics/buildMorningMeetingsIcs';
import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '../../../../../lib/middleware/rateLimit';
import { listMorningMeetingsByDateRange } from '../../../../../lib/morning-meetings/store';

/**
 * Export user's morning meetings (where they are lecturer) as ICS via token
 *
 * SECURITY: Token-based authentication for calendar subscription URLs
 * This uses a persistent token stored in user settings for calendar apps
 * that cannot use Bearer tokens (Google Calendar, Apple Calendar, etc.)
 *
 * SECURITY: Rate limiting prevents token enumeration attacks
 * Limit: 100 requests per hour per IP address
 *
 * NOTE: Tokens should be long, random, and stored hashed in production
 *
 * @route GET /api/ics/morning-meetings/[token]
 * @auth Token-based (for calendar subscriptions)
 */
export async function GET(req: Request) {
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
    if (!token || token.length < 20) {
      return NextResponse.json({ error: 'Invalid token format' }, { status: 400 });
    }

    // Find user by icsToken
    const usersSnap = await getDocs(
      query(collection(db, 'users'), where('settings.icsToken', '==', token)),
    );
    const user = usersSnap.docs[0]?.data() as any;

    if (!user) {
      // Use generic error message to prevent token enumeration
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is active
    if (user.status !== 'active' && user.status !== 'approved') {
      return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    }

    const now = new Date();
    const past = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()));
    const future = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate()),
    );
    const rows = await listMorningMeetingsByDateRange(past, future);

    const matchLecturer = (r: any): boolean => {
      if (r.lecturerUserId && r.lecturerUserId === user.uid) return true;
      // fallback email or name contains
      if (user.email && r.lecturerEmailResolved && r.lecturerEmailResolved === user.email)
        return true;
      if (user.fullName && typeof r.lecturer === 'string') {
        const a = (user.fullName || '').trim().toLowerCase();
        const b = (r.lecturer || '').trim().toLowerCase();
        if (a && b && (a === b || b.includes(a) || a.includes(b))) return true;
      }
      return false;
    };

    const mine = rows.filter(matchLecturer);
    const events = mine.map((r: any) => {
      const start = r.date?.toDate?.() || new Date();
      const end = r.endDate?.toDate?.() || new Date(start.getTime() + 40 * 60 * 1000);
      const uid = `morning-meetings:${r.dateKey}:${simpleHash(String(r.title || ''))}`;
      return {
        uid,
        title: r.title,
        description: r.notes || '',
        url: r.link || undefined,
        start,
        end,
      } as const;
    });
    const ics = buildIcsCalendar('My Morning Meetings', events as any);
    return new NextResponse(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        // Private cache since this is user-specific data
        'cache-control': 'private, max-age=300',
        'content-disposition': 'attachment; filename="my-morning-meetings.ics"',
      },
    });
  } catch {
    // Generic error message to avoid leaking information
    return new NextResponse('Internal server error', { status: 500 });
  }
}
