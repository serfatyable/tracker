import { Timestamp } from 'firebase/firestore';
import type { OnCallAssignment, StationKey } from '../../types/onCall';
import { hebrewHeaderToKey, stationKeys } from './stations';

export type ParsedOnCallCsvRow = {
  dateKey: string; // YYYY-MM-DD
  values: Partial<Record<StationKey, string>>; // raw names per station
};

export function parseDDMMYYYY(input: string): Date | null {
  const m = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10) - 1;
  const yyyy = parseInt(m[3]!, 10);
  const d = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
  return Number.isFinite(d.getTime()) ? d : null;
}

export function toDateKeyUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

export function getShiftBoundsUtcFromAsiaJerusalemDate(d: Date): { start: Date; end: Date } {
  // Shift: 08:00 local on date D to 10:00 local next day
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 5, 0, 0)); // 08:00 Asia/Jerusalem ~ UTC+3
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 7, 0, 0)); // 10:00 next day local
  return { start, end };
}

export function parseOnCallCsv(csvText: string): { header: string[]; rows: ParsedOnCallCsvRow[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { header: [], rows: [] };
  const headerRaw = lines.shift()!;
  const header = headerRaw.split(',').map((s) => String(s || '').trim());
  const headerKeys = header.map((h) => hebrewHeaderToKey[h] || h);
  const rows: ParsedOnCallCsvRow[] = [];
  for (const line of lines) {
    const cols = line.split(',');
    const rec: any = {};
    headerKeys.forEach((key, i) => (rec[String(key)] = String(cols[i] || '').trim()));
    if (!Object.values(rec).some((v: any) => String(v))) continue;
    const dateStr: string = rec['date'] || rec['תאריך'] || rec['dateKey'] || '';
    const d = parseDDMMYYYY(dateStr);
    if (!d) continue;
    const dateKey = toDateKeyUTC(d);
    const values: Partial<Record<StationKey, string>> = {};
    stationKeys.forEach((sk) => {
      const v = (rec[sk] || '').trim();
      if (v) values[sk] = v;
    });
    rows.push({ dateKey, values });
  }
  return { header, rows };
}

export function buildAssignments(params: {
  rows: ParsedOnCallCsvRow[];
  nameToUser: (name: string) => { userId?: string; userDisplayName?: string };
  createdBy: string;
}): { assignments: OnCallAssignment[]; unresolved: Array<{ dateKey: string; stationKey: StationKey; name: string }> } {
  const out: OnCallAssignment[] = [];
  const unresolved: Array<{ dateKey: string; stationKey: StationKey; name: string }> = [];
  for (const row of params.rows) {
    const parts = row.dateKey.split('-').map((p) => parseInt(p, 10));
    const d = new Date(Date.UTC(parts[0] as number, (parts[1] as number) - 1, parts[2] as number));
    const { start, end } = getShiftBoundsUtcFromAsiaJerusalemDate(d);
    for (const sk of Object.keys(row.values) as StationKey[]) {
      const name = String(row.values[sk] || '').trim();
      if (!name) continue;
      const match = params.nameToUser(name);
      if (!match.userId) {
        unresolved.push({ dateKey: row.dateKey, stationKey: sk, name });
        continue;
      }
      out.push({
        id: `${row.dateKey}_${sk}_${match.userId}`,
        dateKey: row.dateKey,
        stationKey: sk,
        userId: match.userId,
        userDisplayName: match.userDisplayName || name,
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        createdAt: Timestamp.now(),
        createdBy: params.createdBy,
      });
    }
  }
  return { assignments: out, unresolved };
}


