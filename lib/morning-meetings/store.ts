import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
  setDoc,
} from 'firebase/firestore';
import { getFirebaseApp } from '../firebase/client';
import type { MorningMeeting } from '../../types/morningMeetings';

export async function listMorningMeetingsByDateRange(
  startInclusive: Date,
  endExclusive: Date,
): Promise<MorningMeeting[]> {
  const db = getFirestore(getFirebaseApp());
  const col = collection(db, 'morningMeetings');
  const qRef = query(
    col,
    where('date', '>=', Timestamp.fromDate(startInclusive)),
    where('date', '<', Timestamp.fromDate(endExclusive)),
    orderBy('date', 'asc'),
  );
  const snap = await getDocs(qRef);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
}

export async function listMorningMeetingsForMonth(
  year: number,
  month0: number, // 0-11
): Promise<MorningMeeting[]> {
  const from = new Date(Date.UTC(year, month0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month0 + 1, 1, 0, 0, 0));
  return listMorningMeetingsByDateRange(from, to);
}

export async function replaceMonthMeetings(
  year: number,
  month0: number,
  rows: MorningMeeting[],
): Promise<void> {
  const db = getFirestore(getFirebaseApp());
  const from = new Date(Date.UTC(year, month0, 1, 0, 0, 0));
  const to = new Date(Date.UTC(year, month0 + 1, 1, 0, 0, 0));
  const existing = await listMorningMeetingsByDateRange(from, to);
  const batch = writeBatch(db);
  for (const ex of existing) if (ex.id) batch.delete(doc(db, 'morningMeetings', ex.id));
  for (const r of rows) {
    const id = `${r.dateKey}-${slug(r.title)}`;
    batch.set(doc(db, 'morningMeetings', id), {
      ...r,
      createdAt: r.createdAt || Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    } as any);
  }
  await batch.commit();
}

function slug(input: string): string {
  return String(input || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05FF\s.-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/\.+/g, '.')
    .replace(/_+/g, '_');
}


