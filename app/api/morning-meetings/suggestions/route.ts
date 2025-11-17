import { NextRequest, NextResponse } from 'next/server';

import { requireAdminAuth, createAuthErrorResponse } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/morning-meetings/suggestions
 * Get autocomplete suggestions for lecturer/moderator/organizer fields
 * Returns: { lecturers: string[], moderators: string[], organizers: string[], users: Array<{ uid: string, fullName: string, email: string }> }
 * Admin only
 */
export async function GET(req: NextRequest) {
  try {
    // Verify admin authentication
    await requireAdminAuth(req);

    const { getFirestore } = await import('firebase-admin/firestore');
    const app = getAdminApp();
    const db = getFirestore(app);

    // Fetch all morning meetings to extract unique names
    const meetingsSnap = await db.collection('morningMeetings').get();

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
    const usersSnap = await db.collection('users').get();
    const userSuggestions = usersSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          fullName: data.fullName || '',
          email: data.email || '',
        };
      })
      .filter((user) => user.fullName); // Only include users with names

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
