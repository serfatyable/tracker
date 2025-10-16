import {
  collection,
  doc,
  getDocs,
  getFirestore,
  orderBy,
  query,
  Timestamp,
  where,
  writeBatch,
} from 'firebase/firestore';

import type { MorningMeeting } from '../../types/morningMeetings';
import { getFirebaseApp } from '../firebase/client';
import { withTimeoutAndRetry } from '../utils/networkUtils';

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

  return withTimeoutAndRetry(
    async () => {
      const snap = await getDocs(qRef);
      return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    },
    {
      timeout: 15000, // 15 seconds for morning meetings
      retries: 3,
      operationName: 'load morning meetings',
    },
  );
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
  return withTimeoutAndRetry(
    async () => {
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
    },
    {
      timeout: 30000, // 30 seconds for batch operations
      retries: 2, // Fewer retries for write operations
      operationName: 'replace month meetings',
    },
  );
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
