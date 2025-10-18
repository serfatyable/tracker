// Client-side Excel parser - only works in browser

export type ValidationError = {
  row: number;
  message: string;
};

export type ParsedOnCallShift = {
  date: Date;
  dayOfWeek?: string;
  shifts: Record<string, string>; // shiftType -> residentName
};

// Shift type column mapping (Column index -> Shift name)
const SHIFT_COLUMNS = {
  2: 'ת.חדר ניתוח',
  3: 'ת. חדר לידה',
  4: 'תורן טיפול נמרץ',
  5: 'ת.חדר ניתוח נשים',
  6: 'תורן PACU',
  7: 'מנהל תורן',
  8: 'תורן חנ בכיר',
  9: 'תורן חצי חנ בכיר',
  10: 'כונן',
  11: 'תורן שליש',
  12: 'כיסוי טפנץ',
  13: 'עובד נוסף',
  14: 'אורתו שצי',
  15: 'אורתו טראומה',
  16: 'אורתו מפרק',
  17: 'SUR',
  18: 'Urol',
  19: 'עמ"ש',
  20: 'כלי דם / חזה',
  21: 'כאב',
  22: 'זריקות עמ"ש',
  23: 'יום מנוחה שבועי',
};

export async function parseOnCallExcel(buffer: ArrayBuffer): Promise<{
  rows: ParsedOnCallShift[];
  errors: ValidationError[];
}> {
  // Dynamic import - only loads in browser
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('No sheets found in workbook');
  }
  const firstSheet = workbook.Sheets[firstSheetName];
  if (!firstSheet) {
    throw new Error('Failed to load sheet');
  }
  const data: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

  const rows: ParsedOnCallShift[] = [];
  const errors: ValidationError[] = [];

  // Start from row 3 (index 2) - rows 1-2 are headers
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const rowNum = i + 1;
    
    // Column A (index 0): Day of week (optional, might be formula)
    // Column B (index 1): Date
    const dateRaw = row[1];
    
    if (!dateRaw) {
      // Empty row, skip
      continue;
    }
    
    // Parse date
    let parsedDate: Date;
    try {
      if (typeof dateRaw === 'number') {
        parsedDate = parseExcelDate(dateRaw);
      } else if (dateRaw instanceof Date) {
        parsedDate = dateRaw;
      } else if (typeof dateRaw === 'string') {
        parsedDate = parseDateString(dateRaw);
      } else {
        errors.push({ row: rowNum, message: `Invalid date format: ${dateRaw}` });
        continue;
      }
      
      if (isNaN(parsedDate.getTime())) {
        errors.push({ row: rowNum, message: 'Invalid date value' });
        continue;
      }
    } catch (error) {
      errors.push({ 
        row: rowNum, 
        message: `Date parse error: ${error instanceof Error ? error.message : String(error)}` 
      });
      continue;
    }
    
    // Extract shifts from columns C onwards
    const shifts: Record<string, string> = {};
    
    for (const [colIdx, shiftType] of Object.entries(SHIFT_COLUMNS)) {
      const value = row[parseInt(colIdx)];
      if (value && typeof value === 'string' && value.trim() !== '') {
        shifts[shiftType] = value.trim();
      }
    }
    
    // Day of week (optional)
    const dayOfWeek = row[0] && typeof row[0] === 'string' ? row[0] : undefined;
    
    rows.push({
      date: parsedDate,
      dayOfWeek,
      shifts,
    });
  }

  return { rows, errors };
}

function parseExcelDate(serial: number): Date {
  const EXCEL_EPOCH = new Date(1899, 11, 30);
  const MS_PER_DAY = 86400000;
  const date = new Date(EXCEL_EPOCH.getTime() + serial * MS_PER_DAY);
  
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid Excel serial number: ${serial}`);
  }
  
  return date;
}

function parseDateString(dateStr: string): Date {
  // Try parsing DD/MM/YYYY format
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1;
    const year = parseInt(parts[2]!, 10);
    return new Date(year, month, day);
  }
  
  // Fallback to standard Date parsing
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error(`Cannot parse date: ${dateStr}`);
  }
  return date;
}

export function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

