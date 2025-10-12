import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, doc, getDoc, serverTimestamp, Timestamp, collection, getDocs, where, query } from 'firebase/firestore';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { parseMorningMeetingsCsv, parseDDMMYYYY, isBasicUrl } from '../../../../lib/morning-meetings/csv';
import { replaceMonthMeetings } from '../../../../lib/morning-meetings/store';
import type { MorningMeeting } from '../../../../types/morningMeetings';

function isAdminProfile(profile: any): boolean {
  return profile && profile.role === 'admin' && profile.status === 'approved';
}

export async function POST(req: NextRequest) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    // Simple server auth: expect X-User-Uid header (App Router can augment later)
    const uid = req.headers.get('x-user-uid');
    if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists() || !isAdminProfile(userSnap.data()))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const csvText = await req.text();
    const { rows } = parseMorningMeetingsCsv(csvText);
    if (!rows.length) return NextResponse.json({ imported: 0, errors: ['empty file'] }, { status: 400 });

    const parsed: Array<{ date: Date; title: string; lecturer: string; organizer: string; link?: string; notes?: string }>= [];
    const monthKeys = new Set<string>();
    const errors: string[] = [];
    rows.forEach((r, idx) => {
      const line = idx + 2;
      const d = parseDDMMYYYY(r.date);
      if (!d) errors.push(`Row ${line}: invalid date '${r.date}'`);
      if (!r.title) errors.push(`Row ${line}: title required`);
      if (!r.lecturer) errors.push(`Row ${line}: lecturer required`);
      if (r.link && !isBasicUrl(r.link)) errors.push(`Row ${line}: invalid link`);
      if (d) monthKeys.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
      if (d)
        parsed.push({
          date: d,
          title: r.title,
          lecturer: r.lecturer,
          organizer: r.organizer,
          link: r.link,
          notes: r.notes,
        });
    });
    if (errors.length) return NextResponse.json({ imported: 0, errors }, { status: 400 });
    if (monthKeys.size !== 1)
      return NextResponse.json({ imported: 0, errors: ['file must contain a single month'] }, { status: 400 });

    const picked = Array.from(monthKeys)[0] as string;
    const parts = picked.split('-');
    const year = parseInt(parts[0] as string, 10);
    const month0 = parseInt(parts[1] as string, 10);
    // Preload users for lecturer match by email or displayName
    const allUsersSnap = await getDocs(query(collection(db, 'users')));
    const users = allUsersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

    function resolveLecturer(p: { lecturer: string }): { userId?: string; email?: string } {
      const key = (p.lecturer || '').trim().toLowerCase();
      if (!key) return {};
      const byEmail = users.find((u) => String(u.email || '').trim().toLowerCase() === key);
      if (byEmail) return { userId: byEmail.id, email: byEmail.email };
      const byName = users.find((u) => String(u.fullName || '').trim().toLowerCase() === key);
      if (byName) return { userId: byName.id, email: byName.email };
      return {};
    }

    const records: MorningMeeting[] = parsed.map((p) => {
      // 07:10–07:50 Asia/Jerusalem: store as UTC timestamps from date base
      const start = new Date(Date.UTC(p.date.getUTCFullYear(), p.date.getUTCMonth(), p.date.getUTCDate(), 4, 10, 0));
      const end = new Date(Date.UTC(p.date.getUTCFullYear(), p.date.getUTCMonth(), p.date.getUTCDate(), 4, 50, 0));
      const dateKey = `${p.date.getUTCFullYear()}-${String(p.date.getUTCMonth() + 1).padStart(2, '0')}-${String(p.date.getUTCDate()).padStart(2, '0')}`;
      const match = resolveLecturer(p);
      return {
        date: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        dateKey,
        title: p.title,
        lecturer: p.lecturer,
        organizer: p.organizer,
        link: p.link || undefined,
        notes: p.notes || undefined,
        lecturerUserId: match.userId,
        lecturerEmailResolved: match.email,
        createdAt: serverTimestamp() as any,
        updatedAt: serverTimestamp() as any,
      } as any;
    });

    await replaceMonthMeetings(year, month0, records);
    return NextResponse.json({ imported: records.length, errors: [] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}


