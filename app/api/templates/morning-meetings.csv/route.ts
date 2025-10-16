import { NextResponse } from 'next/server';

export async function GET() {
  const csv = [
    'date,title,lecturer,organizer,link,notes',
    '01/11/2025,Airway pearls,Dr. Jane Doe,Dr. John Smith,https://example.com/airway.pdf,Focus on RSI pitfalls',
    '02/11/2025,OB anesthesia update,Dr. Alex Cohen,Dr. Dana Levi,,',
  ].join('\n');
  return new NextResponse(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': 'attachment; filename="morning-meetings-template.csv"',
    },
  });
}
