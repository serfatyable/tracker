import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { NextRequest, NextResponse } from 'next/server';

import { getFirebaseApp } from '@/lib/firebase/client';
import type { OnCallDay, StationsMap } from '@/types/onCall';

export const dynamic = 'force-dynamic';

/**
 * POST /api/on-call/manual
 * Manually create or update a single on-call day
 */
export async function POST(req: NextRequest) {
  try {
    const auth = getAuth(getFirebaseApp());
    const currentUser = auth.currentUser;

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const db = getFirestore(getFirebaseApp());
    const userDocRef = doc(db, 'users', currentUser.uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { dateKey, stations } = body as { dateKey: string; stations: StationsMap };

    if (!dateKey || !stations) {
      return NextResponse.json(
        { error: 'Missing required fields: dateKey, stations' },
        { status: 400 },
      );
    }

    // Validate dateKey format (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(dateKey)) {
      return NextResponse.json({ error: 'Invalid dateKey format. Expected YYYY-MM-DD' }, { status: 400 });
    }

    // Parse dateKey and create timestamp for start of day in UTC
    const [year, month, day] = dateKey.split('-').map(Number);
    const dateObj = new Date(Date.UTC(year!, month! - 1, day!, 0, 0, 0, 0));
    const dateTimestamp = Timestamp.fromDate(dateObj);

    // Prepare OnCallDay document
    const onCallDay: Partial<OnCallDay> = {
      dateKey,
      date: dateTimestamp,
      stations,
      createdAt: serverTimestamp() as Timestamp,
    };

    // Save to onCallDays collection
    const onCallDayRef = doc(db, 'onCallDays', dateKey);
    await setDoc(onCallDayRef, onCallDay, { merge: true });

    return NextResponse.json(
      {
        success: true,
        message: 'On-call day saved successfully',
        dateKey,
      },
      { status: 200 },
    );
  } catch (error: any) {
    console.error('Error saving on-call day:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
