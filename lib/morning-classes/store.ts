import {
  collection,
  getDocs,
  getFirestore,
  orderBy,
  query,
  Timestamp,
  where,
} from 'firebase/firestore';

import type { MorningMeeting } from '../../types/morningClasses';
import { getFirebaseApp } from '../firebase/client';

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
