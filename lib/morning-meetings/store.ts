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
import { logger } from '../utils/logger';
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

/**
 * Replace meetings for multiple months in a single operation
 */
export async function replaceMultipleMonthsMeetings(records: MorningMeeting[]): Promise<void> {
  return withTimeoutAndRetry(
    async () => {
      const db = getFirestore(getFirebaseApp());

      // Group records by month to determine which months to delete
      const monthKeys = new Set<string>();
      records.forEach((r) => {
        const date = r.date instanceof Timestamp ? r.date.toDate() : new Date(r.date as any);
        monthKeys.add(`${date.getUTCFullYear()}-${date.getUTCMonth()}`);
      });

      // Delete all existing meetings for affected months
      const deletePromises = Array.from(monthKeys).map(async (monthKey) => {
        const [year, month] = monthKey.split('-').map(Number);
        const from = new Date(Date.UTC(year!, month!, 1, 0, 0, 0));
        const to = new Date(Date.UTC(year!, month! + 1, 1, 0, 0, 0));
        const existing = await listMorningMeetingsByDateRange(from, to);
        return existing;
      });

      const allExisting = (await Promise.all(deletePromises)).flat();

      // Create a batch for all operations
      const batch = writeBatch(db);

      // Delete existing meetings
      for (const ex of allExisting) {
        if (ex.id) batch.delete(doc(db, 'morningMeetings', ex.id));
      }

      // Add new meetings
      for (const r of records) {
        const id = `${r.dateKey}-${slug(r.title)}`;
        batch.set(doc(db, 'morningMeetings', id), {
          ...r,
          createdAt: r.createdAt || Timestamp.fromDate(new Date()),
          updatedAt: Timestamp.fromDate(new Date()),
        } as any);
      }

      await batch.commit();
      logger.info(
        `Replaced ${allExisting.length} existing meetings with ${records.length} new meetings across ${monthKeys.size} month(s)`,
        'morning-meetings-store',
      );
    },
    {
      timeout: 45000, // 45 seconds for multi-month batch operations
      retries: 2,
      operationName: 'replace multiple months meetings',
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
