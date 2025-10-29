import { getFirestore } from 'firebase/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { verifyAuthToken, createAuthErrorResponse } from '../../../../lib/api/auth';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { buildIcsCalendar, simpleHash } from '../../../../lib/ics/buildMorningMeetingsIcs';
import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '../../../../lib/middleware/rateLimit';
import { listMorningMeetingsByDateRange } from '../../../../lib/morning-meetings/store';

/**
 * Export all morning meetings as ICS calendar file
 *
 * SECURITY: Requires authentication via Firebase ID token
 * SECURITY: Rate limiting prevents calendar export abuse (100 requests per hour)
 * Returns all morning meetings (public schedule within organization)
 *
 * @route GET /api/ics/morning-meetings
 * @auth Required - Any authenticated user
 */
export async function GET(req: NextRequest) {
  // ✅ SECURE: Verify Firebase ID token
  try {
    const authResult = await verifyAuthToken(req);

    // ✅ RATE LIMITING: Prevent calendar export abuse
    const identifier = getClientIdentifier(req, authResult?.uid);
    const rateLimitResponse = await checkRateLimit(identifier, rateLimiters?.standard ?? null);
    if (rateLimitResponse) {
      return rateLimitResponse; // 429 Too Many Requests
    }

    const app = getFirebaseApp();
    getFirestore(app); // ensure initialized
    const now = new Date();
    const past = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()));
    const future = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate()),
    );
    const rows = await listMorningMeetingsByDateRange(past, future);
    const events = rows.map((r: any) => {
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
    const ics = buildIcsCalendar('Morning Meetings', events as any);
    return new NextResponse(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'cache-control': 'private, max-age=300',
        'content-disposition': 'attachment; filename="morning-meetings.ics"',
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
