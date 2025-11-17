import { doc, getFirestore, setDoc, Timestamp } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import { verifyAuthToken } from '@/lib/firebase/serverAuth';
import { logger } from '@/lib/utils/logger';
import type { MorningMeeting } from '@/types/morningMeetings';

/**
 * POST /api/morning-meetings
 * Create a new morning meeting
 * Admin only
 */
export async function POST(req: NextRequest) {
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

    // Create meeting object
    const meeting: Omit<MorningMeeting, 'id'> = {
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
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
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

    // Save to Firestore
    const db = getFirestore(getFirebaseApp());
    await setDoc(doc(db, 'morningMeetings', docId), meeting);

    logger.info(`Created morning meeting: ${docId}`, 'api/morning-meetings');

    return NextResponse.json({ success: true, id: docId, meeting }, { status: 201 });
  } catch (error) {
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
