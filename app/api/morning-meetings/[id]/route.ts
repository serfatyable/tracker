import { deleteDoc, doc, getDoc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import { verifyAuthToken } from '@/lib/firebase/serverAuth';
import { logger } from '@/lib/utils/logger';
import type { MorningMeeting } from '@/types/morningMeetings';

/**
 * PATCH /api/morning-meetings/[id]
 * Update an existing morning meeting
 * Admin only
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyAuthToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = params;
    const db = getFirestore(getFirebaseApp());
    const meetingRef = doc(db, 'morningMeetings', id);

    // Check if meeting exists
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists()) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Parse request body
    const body = await req.json();
    const { title, date, endDate, dayOfWeek, lecturer, moderator, organizer, link, notes } = body;

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
    const updatedMeeting: Partial<MorningMeeting> = {
      updatedAt: Timestamp.now(),
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

    // Save to Firestore
    await setDoc(meetingRef, finalMeeting);

    logger.info(`Updated morning meeting: ${id}`, 'api/morning-meetings/[id]');

    return NextResponse.json({ success: true, id, meeting: finalMeeting }, { status: 200 });
  } catch (error) {
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
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyAuthToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Verify admin role
    if (decodedToken.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { id } = params;
    const db = getFirestore(getFirebaseApp());
    const meetingRef = doc(db, 'morningMeetings', id);

    // Check if meeting exists
    const meetingSnap = await getDoc(meetingRef);
    if (!meetingSnap.exists()) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    // Delete from Firestore
    await deleteDoc(meetingRef);

    logger.info(`Deleted morning meeting: ${id}`, 'api/morning-meetings/[id]');

    return NextResponse.json({ success: true, id }, { status: 200 });
  } catch (error) {
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
