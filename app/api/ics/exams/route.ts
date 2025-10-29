import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { verifyAuthToken, createAuthErrorResponse } from '@/lib/api/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '@/lib/middleware/rateLimit';
import { generateExamICS } from '@/lib/utils/examIcs';
import type { Exam } from '@/types/exam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ics/exams
 * Generates an ICS file for all active exams
 *
 * SECURITY: Requires authentication via Firebase ID token
 * SECURITY: Rate limiting prevents abuse (100 requests per hour per user)
 *
 * NOTE: For calendar subscription URLs (Google Calendar, etc.), use the token-based endpoint:
 * /api/ics/exams/[token] - This endpoint is for direct download with auth header
 *
 * Query params:
 * - lang: 'en' | 'he' (default: 'en')
 * - upcoming: 'true' | 'false' (default: 'false') - only include future exams
 *
 * @route GET /api/ics/exams
 * @auth Required - Any authenticated user
 */
export async function GET(request: NextRequest) {
  // ✅ SECURE: Verify Firebase ID token
  try {
    const auth = await verifyAuthToken(request);

    // ✅ RATE LIMITING: Prevent calendar export abuse
    const identifier = getClientIdentifier(request, auth?.uid);
    const rateLimitResponse = await checkRateLimit(identifier, rateLimiters?.standard ?? null);
    if (rateLimitResponse) {
      return rateLimitResponse; // 429 Too Many Requests
    }
    const searchParams = request.nextUrl.searchParams;
    const lang = (searchParams.get('lang') || 'en') as 'en' | 'he';
    const upcomingOnly = searchParams.get('upcoming') === 'true';

    const db = getFirestore(getFirebaseApp());
    const examsCol = collection(db, 'exams');

    let q = query(examsCol, where('isActive', '==', true), orderBy('examDate', 'asc'));

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
        'Cache-Control': 'private, max-age=300',
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
    console.error('Error generating exams ICS:', error);
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 });
  }
}
