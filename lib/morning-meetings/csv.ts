export type CsvRow = {
  date: string;
  title: string;
  lecturer: string;
  organizer: string;
  link?: string;
  notes?: string;
};

export function parseMorningMeetingsCsv(text: string): { header: string[]; rows: CsvRow[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (!lines.length) return { header: [], rows: [] };
  const header = lines
    .shift()!
    .split(',')
    .map((s: any) =>
      String(s || '')
        .trim()
        .toLowerCase(),
    ) as string[];
  const rows: CsvRow[] = [];
  for (const line of lines) {
    const cols = line.split(',');
    const rec: any = {};
    (header as string[]).forEach((h: string, i: number) => (rec[h] = String(cols[i] || '').trim()));
    if (!Object.values(rec).some((v: any) => String(v))) continue; // skip blank
    rows.push({
      date: rec['date'] || '',
      title: rec['title'] || '',
      lecturer: rec['lecturer'] || '',
      organizer: rec['organizer'] || '',
      link: rec['link'] || '',
      notes: rec['notes'] || '',
    });
  }
  return { header, rows };
}

export function parseDDMMYYYY(input: string): Date | null {
  const m = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const dd = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10) - 1;
  const yyyy = parseInt(m[3]!, 10);
  const d = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
  return Number.isFinite(d.getTime()) ? d : null;
}

export function isBasicUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}
