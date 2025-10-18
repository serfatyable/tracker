import { NextResponse } from 'next/server';

export async function GET() {
  const csv = [
    'יום,תאריך,נושא,מציג,מנחה,רכז,link,notes',
    'א,19/10/2025,AW assessment & AW management; difficult AW & Extubation part 1 out of 4,ד״ר דן קוטלר,ד״ר מונה ליכטנשטיין,ד״ר נעימה קציר,https://example.com/meeting1.pdf,',
    ',,Advanced Hemodynamic Monitoring,,,ד״ר נעימה קציר,,Second session - same day (empty day/date)',
    'ב,20/10/2025,הניחן ריפואי,ד״ר עזרא ארנפלד,ד״ר אלית רחמן,ד״ר גיא פיינברג,,',
    'ג,21/10/2025,הניחן ריפואי,ד״ר שמעון כהן,ד״ר מוניה לקלמן,ד״ר רון בן טור,https://zoom.us/j/example,',
  ].join('\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="morning-meetings-template.csv"',
    },
  });
}
