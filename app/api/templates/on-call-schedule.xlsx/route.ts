import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // Create a new workbook
    const wb = XLSX.utils.book_new();

    // Define the headers (Row 1: Title, Row 2: Column headers)
    const data: any[][] = [
      // Row 1: Title
      ['לוח תורנויות - תבנית'],

      // Row 2: Column headers (22 shift types)
      [
        'יום', // Day of week
        'תאריך', // Date
        'ת.חדר ניתוח', // OR main
        'ת. חדר לידה', // Labor & Delivery
        'תורן טיפול נמרץ', // ICU on-call
        'ת.חדר ניתוח נשים', // OR Gyne
        'תורן PACU', // PACU on-call
        'מנהל תורן', // On-call manager
        'תורן חנ בכיר', // Senior OR
        'תורן חצי חנ בכיר', // Semi-senior OR
        'כונן', // Backup
        'תורן שליש', // Third on-call
        'כיסוי טפנץ', // Coverage
        'עובד נוסף', // Additional worker
        'אורתו שצי', // Ortho routine
        'אורתו טראומה', // Ortho trauma
        'אורתו מפרק', // Ortho joint
        'SUR', // Surgery
        'Urol', // Urology
        'עמ"ש', // Spine
        'כלי דם / חזה', // Vascular/Thoracic
        'כאב', // Pain
        'זריקות עמ"ש', // Spine injections
        'יום מנוחה שבועי', // Weekly rest day
      ],
    ];

    // Add example rows (one week of data)
    const startDate = new Date();
    startDate.setDate(1); // Start from 1st of current month

    const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // Hebrew day names

    // Add 7 example days
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const dayOfWeek = dayNames[currentDate.getDay()];

      // Create row with date and empty cells for shifts
      const row = [
        dayOfWeek,
        currentDate, // Excel will format this as a date
        i === 0 ? 'ד"ר כהן' : '', // Example name on first day
        i === 1 ? 'ד"ר לוי' : '', // Example name on second day
        '',
        i === 2 ? 'ד"ר מזרחי' : '', // Example name on third day
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        i === 6 ? 'ד"ר אברהם' : '', // Example rest day
      ];

      data.push(row);
    }

    // Add a few more empty rows for user to fill
    for (let i = 0; i < 23; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + 7 + i);

      const dayOfWeek = dayNames[currentDate.getDay()];

      data.push([
        dayOfWeek,
        currentDate,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
      ]);
    }

    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    ws['!cols'] = [
      { wch: 5 }, // Day
      { wch: 12 }, // Date
      { wch: 15 }, // OR main
      { wch: 15 }, // Labor
      { wch: 15 }, // ICU
      { wch: 15 }, // OR Gyne
      { wch: 12 }, // PACU
      { wch: 12 }, // Manager
      { wch: 15 }, // Senior OR
      { wch: 15 }, // Semi-senior
      { wch: 12 }, // Backup
      { wch: 12 }, // Third
      { wch: 12 }, // Coverage
      { wch: 12 }, // Additional
      { wch: 12 }, // Ortho routine
      { wch: 12 }, // Ortho trauma
      { wch: 12 }, // Ortho joint
      { wch: 10 }, // SUR
      { wch: 10 }, // Urol
      { wch: 10 }, // Spine
      { wch: 15 }, // Vascular
      { wch: 10 }, // Pain
      { wch: 12 }, // Spine injections
      { wch: 15 }, // Rest day
    ];

    // Merge cells for title (A1:X1)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 23 } }];

    // Style the title row (bold, centered, larger font)
    if (!ws['A1']) ws['A1'] = { t: 's', v: '' };
    ws['A1'].s = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: 'center', vertical: 'center' },
      fill: { fgColor: { rgb: 'CCCCCC' } },
    };

    // Style the header row (bold, centered, background color)
    const _headerRow = 2; // Row 2 in Excel (0-indexed as 1)
    for (let col = 0; col < 24; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: 1, c: col });
      if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
      ws[cellAddress].s = {
        font: { bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'E7E6E6' } },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      };
    }

    // Add borders to all data cells
    for (let row = 2; row < data.length; row++) {
      for (let col = 0; col < 24; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };

        // Format date column (B)
        if (col === 1 && ws[cellAddress].v) {
          ws[cellAddress].t = 'd';
          ws[cellAddress].z = 'dd/mm/yyyy';
        }

        ws[cellAddress].s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border: {
            top: { style: 'thin', color: { rgb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
            left: { style: 'thin', color: { rgb: 'CCCCCC' } },
            right: { style: 'thin', color: { rgb: 'CCCCCC' } },
          },
        };
      }
    }

    // Set RTL (right-to-left) for the worksheet
    ws['!dir'] = 'rtl';

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'תורנויות');

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Return the file
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="on-call-schedule-template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json({ error: 'Failed to generate template file' }, { status: 500 });
  }
}
