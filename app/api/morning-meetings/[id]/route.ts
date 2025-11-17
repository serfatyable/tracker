import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth, createAuthErrorResponse } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { logger } from '@/lib/utils/logger';
import type { MorningMeeting } from '@/types/morningMeetings';

/**
 * PATCH /api/morning-meetings/[id]
 * Update an existing morning meeting
 * Admin only
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify admin authentication
    await requireAdminAuth(req);

    const { id } = params;
    const { getFirestore } = await import('firebase-admin/firestore');
    const app = getAdminApp();
    const db = getFirestore(app);
    const meetingRef = db.collection('morningMeetings').doc(id);

    // Check if meeting exists
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const { title, date, endDate, dayOfWeek, lecturer, moderator, organizer, link, notes } = body;

    // Import Timestamp and FieldValue from admin SDK
    const { Timestamp, FieldValue } = await import('firebase-admin/firestore');

    // Get existing meeting data
    const existingMeeting = meetingSnap.data() as MorningMeeting;

    // Parse dates if provided
    let meetingDate: Date | undefined;
    let meetingEndDate: Date | undefined;
    let dateKey: string | undefined;
    let calculatedDayOfWeek: string | undefined;

    if (date) {
      meetingDate = new Date(date);
      dateKey = meetingDate.toISOString().split('T')[0];

      // Auto-calculate Hebrew day of week
      const hebrewDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
      calculatedDayOfWeek = hebrewDays[meetingDate.getDay()];
    }

    if (endDate) {
      meetingEndDate = new Date(endDate);
    } else if (meetingDate) {
      // If date changed but endDate not provided, calculate new endDate based on existing duration
      const existingDuration =
        existingMeeting.endDate && existingMeeting.date
          ? existingMeeting.endDate.toMillis() - existingMeeting.date.toMillis()
          : 40 * 60 * 1000; // default 40 minutes
      meetingEndDate = new Date(meetingDate.getTime() + existingDuration);
    }

    // Create updated meeting object (only update provided fields)
    const updatedMeeting: any = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) updatedMeeting.title = title;
    if (meetingDate) updatedMeeting.date = Timestamp.fromDate(meetingDate);
    if (meetingEndDate) updatedMeeting.endDate = Timestamp.fromDate(meetingEndDate);
    if (dateKey) updatedMeeting.dateKey = dateKey;
    if (dayOfWeek !== undefined) {
      updatedMeeting.dayOfWeek = dayOfWeek;
    } else if (calculatedDayOfWeek) {
      updatedMeeting.dayOfWeek = calculatedDayOfWeek;
    }
    if (lecturer !== undefined) updatedMeeting.lecturer = lecturer || undefined;
    if (moderator !== undefined) updatedMeeting.moderator = moderator || undefined;
    if (organizer !== undefined) updatedMeeting.organizer = organizer || undefined;
    if (link !== undefined) updatedMeeting.link = link || undefined;
    if (notes !== undefined) updatedMeeting.notes = notes || undefined;

    // Merge with existing data
    const finalMeeting = {
      ...existingMeeting,
      ...updatedMeeting,
    };

    // Save to Firestore using Admin SDK
    await meetingRef.set(finalMeeting);

    logger.info(`Updated morning meeting: ${id}`, 'api/morning-meetings/[id]');

    return NextResponse.json({ success: true, id, meeting: finalMeeting }, { status: 200 });
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
      'Failed to update morning meeting',
      'api/morning-meetings/[id]',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Failed to update meeting', details: String(error) },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/morning-meetings/[id]
 * Delete a morning meeting
 * Admin only
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify admin authentication
    await requireAdminAuth(req);

    const { id } = params;
    const { getFirestore } = await import('firebase-admin/firestore');
    const app = getAdminApp();
    const db = getFirestore(app);
    const meetingRef = db.collection('morningMeetings').doc(id);

    // Check if meeting exists
    const meetingSnap = await meetingRef.get();
    if (!meetingSnap.exists) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Delete from Firestore
    await meetingRef.delete();

    logger.info(`Deleted morning meeting: ${id}`, 'api/morning-meetings/[id]');

    return NextResponse.json({ success: true, id }, { status: 200 });
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
      'Failed to delete morning meeting',
      'api/morning-meetings/[id]',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Failed to delete meeting', details: String(error) },
      { status: 500 },
    );
  }
}
