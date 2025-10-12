import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { NextResponse } from 'next/server';

import { getFirebaseApp } from '../../../../../lib/firebase/client';
import { buildIcsCalendar, simpleHash } from '../../../../../lib/ics/buildMorningMeetingsIcs';
import { listMorningMeetingsByDateRange } from '../../../../../lib/morning-meetings/store';

export async function GET(req: Request) {
  const app = getFirebaseApp();
  const db = getFirestore(app);
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const token = segments[segments.length - 1];
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });
  // Find user by icsToken
  const usersSnap = await getDocs(
    query(collection(db, 'users'), where('settings.icsToken', '==', token)),
  );
  const user = usersSnap.docs[0]?.data() as any;
  if (!user) return NextResponse.json({ error: 'invalid token' }, { status: 404 });

  const now = new Date();
  const past = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()));
  const future = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate()));
  const rows = await listMorningMeetingsByDateRange(past, future);

  const matchLecturer = (r: any): boolean => {
    if (r.lecturerUserId && r.lecturerUserId === user.uid) return true;
    // fallback email or name contains
    if (user.email && r.lecturerEmailResolved && r.lecturerEmailResolved === user.email)
      return true;
    if (user.fullName && typeof r.lecturer === 'string') {
      const a = (user.fullName || '').trim().toLowerCase();
      const b = (r.lecturer || '').trim().toLowerCase();
      if (a && b && (a === b || b.includes(a) || a.includes(b))) return true;
    }
    return false;
  };

  const mine = rows.filter(matchLecturer);
  const events = mine.map((r: any) => {
    const start = r.date?.toDate?.() || new Date();
    const end = r.endDate?.toDate?.() || new Date(start.getTime() + 40 * 60 * 1000);
    const uid = `morning-meetings:${r.dateKey}:${simpleHash(String(r.title || ''))}`;
    return {
      uid,
      title: r.title,
      description: r.notes || '',
      url: r.link || undefined,
      start,
      end,
    } as const;
  });
  const ics = buildIcsCalendar('My Morning Meetings', events as any);
  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'content-disposition': 'attachment; filename="my-morning-meetings.ics"',
    },
  });
}
