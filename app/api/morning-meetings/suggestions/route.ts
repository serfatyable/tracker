import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { NextRequest, NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import { getAllUsers } from '@/lib/firebase/db';
import { verifyAuthToken } from '@/lib/firebase/serverAuth';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/morning-meetings/suggestions
 * Get autocomplete suggestions for lecturer/moderator/organizer fields
 * Returns: { lecturers: string[], moderators: string[], organizers: string[], users: Array<{ uid: string, fullName: string, email: string }> }
 * Admin only
 */
export async function GET(req: NextRequest) {
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

    const db = getFirestore(getFirebaseApp());

    // Fetch all morning meetings to extract unique names
    const meetingsCol = collection(db, 'morningMeetings');
    const meetingsSnap = await getDocs(meetingsCol);

    const lecturersSet = new Set<string>();
    const moderatorsSet = new Set<string>();
    const organizersSet = new Set<string>();

    meetingsSnap.docs.forEach((doc) => {
      const data = doc.data();
      if (data.lecturer) lecturersSet.add(data.lecturer.trim());
      if (data.moderator) moderatorsSet.add(data.moderator.trim());
      if (data.organizer) organizersSet.add(data.organizer.trim());
    });

    // Fetch all users for autocomplete
    const users = await getAllUsers();
    const userSuggestions = users.map((user) => ({
      uid: user.uid,
      fullName: user.fullName,
      email: user.email,
    }));

    return NextResponse.json(
      {
        lecturers: Array.from(lecturersSet).sort(),
        moderators: Array.from(moderatorsSet).sort(),
        organizers: Array.from(organizersSet).sort(),
        users: userSuggestions,
      },
      { status: 200 },
    );
  } catch (error) {
    logger.error(
      'Failed to fetch meeting suggestions',
      'api/morning-meetings/suggestions',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Failed to fetch suggestions', details: String(error) },
      { status: 500 },
    );
  }
}
