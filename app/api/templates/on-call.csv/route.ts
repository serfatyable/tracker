import { NextResponse } from 'next/server';

export async function GET() {
  const header = [
    'יום',
    'תאריך',
    'ת.חדר ניתוח',
    'ת. חדר לידה',
    'תורן טיפול נמרץ',
    'ת.חדר ניתוח נשים',
    'תורן PACU',
    'מנהל תורן',
    'תורן חנ בכיר',
    'תורן חצי חנ בכיר',
    'אורתו שצי',
    'אורתו טראומה',
    'אורתו מפרק',
    'SUR',
    'Urol',
    'עמ"ש',
    'כלי דם / חזה',
    'כאב',
    'זריקות עמ"ש',
    'יום מנוחה שבועי',
  ].join(',');
  const csv = [
    header,
    'א,01/11/2025,Dr. Jane Doe,Dr. John Smith,Dr. Alex Cohen,Dr. Dana Levi,Dr. Amir Bar,Dr. Lee,Dr. Kim,Dr. Park,Dr. Azulay,Dr. Navon,Dr. Katz,Dr. Surge,Dr. Uro,Dr. Spine,Dr. Vasc,Dr. Pain,Dr. Spine2,',
    'ב,02/11/2025,Dr. Jane2 Doe2,Dr. John2 Smith2,Dr. Alex2 Cohen2,Dr. Dana2 Levi2,Dr. Amir2 Bar2,Dr. Lee2,Dr. Kim2,Dr. Park2,Dr. Azulay2,Dr. Navon2,Dr. Katz2,Dr. Surge2,Dr. Uro2,Dr. Spine2,Dr. Vasc2,Dr. Pain2,Dr. Spine22,',
  ].join('\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="on-call-template.csv"',
    },
  });
}


