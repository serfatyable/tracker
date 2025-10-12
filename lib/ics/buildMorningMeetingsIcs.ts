type IcsEvent = {
  uid: string;
  title: string;
  description?: string;
  url?: string;
  start: Date; // in local Asia/Jerusalem time
  end: Date; // in local Asia/Jerusalem time
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function formatLocal(dt: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
    .formatToParts(dt)
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== 'literal') acc[p.type] = p.value;
      return acc;
    }, {});
  const y = parts.year || '2000';
  const m = parts.month || '01';
  const d = parts.day || '01';
  const hh = parts.hour || '00';
  const mm = parts.minute || '00';
  const ss = parts.second || '00';
  return `${y}${m}${d}T${hh}${mm}${ss}`;
}

function foldLine(s: string): string {
  // iCalendar requires CRLF and 75 octet line length folding; keep simple folding by 70 chars
  const lines: string[] = [];
  for (let i = 0; i < s.length; i += 70) {
    lines.push((i === 0 ? '' : ' ') + s.slice(i, i + 70));
  }
  return lines.join('\r\n');
}

export function buildIcsCalendar(calName: string, events: IcsEvent[]): string {
  const tz = 'Asia/Jerusalem';
  const dtstamp = formatLocal(new Date(), 'UTC') + 'Z';
  const header = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tracker//Morning Meetings//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${calName}`,
    'METHOD:PUBLISH',
  ];
  const tzblock = [
    'BEGIN:VTIMEZONE',
    `TZID:${tz}`,
    'X-LIC-LOCATION:Asia/Jerusalem',
    // Minimal rules; clients may update from tzdb
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0300',
    'TZOFFSETTO:+0200',
    'TZNAME:IST',
    'DTSTART:19701025T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU',
    'END:STANDARD',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:+0200',
    'TZOFFSETTO:+0300',
    'TZNAME:IDT',
    'DTSTART:19700329T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU',
    'END:DAYLIGHT',
    'END:VTIMEZONE',
  ];
  const body: string[] = [];
  for (const ev of events) {
    const dtStartLocal = formatLocal(ev.start, tz);
    const dtEndLocal = formatLocal(ev.end, tz);
    const lines = [
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${tz}:${dtStartLocal}`,
      `DTEND;TZID=${tz}:${dtEndLocal}`,
      foldLine(`SUMMARY:${ev.title}`),
    ];
    if (ev.description) lines.push(foldLine(`DESCRIPTION:${ev.description}`));
    if (ev.url) lines.push(`URL:${ev.url}`);
    lines.push('END:VEVENT');
    body.push(...lines);
  }
  const footer = ['END:VCALENDAR'];
  return [...header, ...tzblock, ...body, ...footer].join('\r\n');
}

export function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}


