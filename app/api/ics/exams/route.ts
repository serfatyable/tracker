import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import { generateExamICS } from '@/lib/utils/examIcs';
import type { Exam } from '@/types/exam';

export const dynamic = 'force-dynamic';

/**
 * GET /api/ics/exams
 * Generates an ICS file for all active exams
 * Query params:
 * - lang: 'en' | 'he' (default: 'en')
 * - upcoming: 'true' | 'false' (default: 'false') - only include future exams
 */
export async function GET(request: NextRequest) {
  try {
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
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error generating exams ICS:', error);
    return NextResponse.json({ error: 'Failed to generate calendar file' }, { status: 500 });
  }
}
