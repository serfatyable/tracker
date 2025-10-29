import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import { isValidTokenFormat } from '@/lib/ics/tokens';
import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/middleware/rateLimit';
import { generateExamICS } from '@/lib/utils/examIcs';
import type { Exam } from '@/types/exam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ics/exams/[token]
 * Generates an ICS file for all active exams (token-based auth for calendar apps)
 *
 * SECURITY: Token-based authentication for calendar subscription URLs
 * This uses a persistent token stored in user settings for calendar apps
 * that cannot use Bearer tokens (Google Calendar, Apple Calendar, etc.)
 *
 * SECURITY: Rate limiting prevents token enumeration attacks
 * Limit: 100 requests per hour per IP address
 *
 * Query params:
 * - lang: 'en' | 'he' (default: 'en')
 * - upcoming: 'true' | 'false' (default: 'false') - only include future exams
 *
 * @route GET /api/ics/exams/[token]
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

    // Verify user is active
    if (user.status !== 'active' && user.status !== 'approved') {
      return NextResponse.json({ error: 'Account not active' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = url.searchParams;
    const lang = (searchParams.get('lang') || 'en') as 'en' | 'he';
    const upcomingOnly = searchParams.get('upcoming') === 'true';

    // Fetch exams
    const examsCol = collection(db, 'exams');
    const q = query(examsCol, where('isActive', '==', true), orderBy('examDate', 'asc'));
    const snapshot = await getDocs(q);
    let exams = snapshot.docs.map((doc) => doc.data() as Exam);

    // Filter to upcoming only if requested
    if (upcomingOnly) {
      const now = new Date();
      exams = exams.filter((exam) => exam.examDate.toDate() > now);
    }

    const icsContent = generateExamICS(exams, lang);

    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="exams-${lang}.ics"`,
        // Private cache since this is user-specific data
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    // Generic error message to avoid leaking information
    console.error('Error generating exams ICS:', error);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
