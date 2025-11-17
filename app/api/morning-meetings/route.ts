import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdminAuth, createAuthErrorResponse } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/morning-meetings
 * Create a new morning meeting
 * Admin only
 */
export async function POST(req: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdminAuth(req);

    // Parse request body
    const body = await req.json();
    const { title, date, endDate, dayOfWeek, lecturer, moderator, organizer, link, notes } = body;

    // Validate required fields
    if (!title || !date) {
      return NextResponse.json(
        { error: 'Missing required fields: title and date are required' },
        { status: 400 },
      );
    }

    // Parse dates
    const meetingDate = new Date(date);
    const meetingEndDate = endDate ? new Date(endDate) : new Date(meetingDate.getTime() + 40 * 60 * 1000);

    // Generate dateKey (YYYY-MM-DD)
    const dateKey = meetingDate.toISOString().split('T')[0];

    // Generate Hebrew day of week if not provided
    const hebrewDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
    const calculatedDayOfWeek = hebrewDays[meetingDate.getDay()];

    // Import Timestamp from admin SDK
    const { Timestamp } = await import('firebase-admin/firestore');

    // Create meeting object
    const meeting = {
      title,
      date: Timestamp.fromDate(meetingDate),
      endDate: Timestamp.fromDate(meetingEndDate),
      dateKey: dateKey!,
      dayOfWeek: dayOfWeek || calculatedDayOfWeek!,
      lecturer: lecturer || undefined,
      moderator: moderator || undefined,
      organizer: organizer || undefined,
      link: link || undefined,
      notes: notes || undefined,
    };

    // Generate document ID
    const slug = String(title || '')
      .toLowerCase()
      .replace(/[^a-z0-9\u0590-\u05FF\s.-]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/\.+/g, '.')
      .replace(/_+/g, '_');
    const docId = `${dateKey}-${slug}`;

    // Save to Firestore using Admin SDK
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const app = getAdminApp();
    const db = getFirestore(app);

    await db.collection('morningMeetings').doc(docId).set({
      ...meeting,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    logger.info(`Created morning meeting: ${docId}`, 'api/morning-meetings');

    return NextResponse.json({ success: true, id: docId, meeting }, { status: 201 });
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

    logger.error(
      'Failed to create morning meeting',
      'api/morning-meetings',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Failed to create meeting', details: String(error) },
      { status: 500 },
    );
  }
}
