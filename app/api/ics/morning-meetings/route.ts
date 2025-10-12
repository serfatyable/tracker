import { NextResponse } from 'next/server';
import { getFirestore } from 'firebase/firestore';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { listMorningMeetingsByDateRange } from '../../../../lib/morning-meetings/store';
import { buildIcsCalendar, simpleHash } from '../../../../lib/ics/buildMorningMeetingsIcs';

export async function GET() {
  const app = getFirebaseApp();
  getFirestore(app); // ensure initialized
  const now = new Date();
  const past = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, now.getUTCDate()));
  const future = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 6, now.getUTCDate()));
  const rows = await listMorningMeetingsByDateRange(past, future);
  const events = rows.map((r: any) => {
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
  const ics = buildIcsCalendar('Morning Meetings', events as any);
  return new NextResponse(ics, {
    headers: {
      'content-type': 'text/calendar; charset=utf-8',
      'cache-control': 'public, max-age=300',
      'content-disposition': 'attachment; filename="morning-meetings.ics"',
    },
  });
}


