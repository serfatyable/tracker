import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  // Create workbook with sample data for morning meetings
  const data = [
    ['יום', 'תאריך', 'נושא', 'מציג', 'מנחה', 'רכז', 'link', 'notes'],
    [
      'א',
      '19/10/2025',
      'AW assessment & AW management, difficult AW & Extubation part 1 out of 4',
      'ד״ר דן קוטלר',
      'ד״ר מונה ליכטנשטיין',
      'ד״ר נעימה קציר',
      'https://example.com/meeting1.pdf',
      '',
    ],
    [
      '',
      '',
      'Advanced Hemodynamic Monitoring',
      '',
      '',
      'ד״ר נעימה קציר',
      '',
      'Second session - same day (empty day/date)',
    ],
    [
      'ב',
      '20/10/2025',
      'הניחן ריפואי',
      'ד״ר עזרא ארנפלד',
      'ד״ר אלית רחמן',
      'ד״ר גיא פיינברג',
      '',
      '',
    ],
    [
      'ג',
      '21/10/2025',
      'הניחן ריפואי',
      'ד״ר שמעון כהן',
      'ד״ר מוניה לקלמן',
      'ד״ר רון בן טור',
      'https://zoom.us/j/example',
      '',
    ],
    ['ד', '22/10/2025', 'הדרכה בטוחות - עפר דאגן', 'עפר דאגן', 'ד״ר שני אדלר', 'קבוצות', '', ''],
    [
      'ה',
      '23/10/2025',
      'ישיבת בוקר מחלקתית',
      'ד״ר איל יחזקאל',
      'ד״ר אדם נסאר',
      'ד״ר עידן גולדי',
      '',
      'פורום טראומה',
    ],
  ];

  // Create worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(data);

  // Set column widths for better readability
  worksheet['!cols'] = [
    { wch: 8 }, // יום (day)
    { wch: 12 }, // תאריך (date)
    { wch: 60 }, // נושא (title)
    { wch: 25 }, // מציג (lecturer)
    { wch: 25 }, // מנחה (moderator)
    { wch: 20 }, // רכז (organizer)
    { wch: 40 }, // link
    { wch: 30 }, // notes
  ];

  // Create workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Morning Meetings');

  // Generate Excel file buffer
  const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  return new NextResponse(excelBuffer, {
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': 'attachment; filename="morning-meetings-template.xlsx"',
    },
  });
}
