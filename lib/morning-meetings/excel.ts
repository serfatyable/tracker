import * as XLSX from 'xlsx';

export type ExcelRow = {
  dayOfWeek: string; // יום: א, ב, ג, ד, ה, ו
  date: string; // תאריך
  title: string; // נושא
  lecturer?: string; // מציג (optional)
  moderator?: string; // מנחה (optional)
  organizer?: string; // רכז (optional)
  link?: string;
  notes?: string;
};

export type ParsedExcelResult = {
  rows: ExcelRow[];
  errors: Array<{ row: number; message: string }>;
};

/**
 * Parse Excel file for morning meetings
 * Required columns: יום, תאריך, נושא
 * Optional columns: מציג, מנחה, רכז, link, notes
 * 
 * Handles both Excel serial date numbers (45949, 45950, etc.) and DD/MM/YYYY strings
 */
export function parseMorningMeetingsExcel(buffer: ArrayBuffer): ParsedExcelResult {
  const errors: Array<{ row: number; message: string }> = [];
  const rows: ExcelRow[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0] as string];
    if (!firstSheet) {
      errors.push({ row: 0, message: 'No sheet found in Excel file' });
      return { rows: [], errors };
    }

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    if (jsonData.length < 2) {
      errors.push({ row: 0, message: 'Excel file must have at least a header row and one data row' });
      return { rows: [], errors };
    }

    const headerRow = jsonData[0] as string[];
    
    // Find column indices (support both Hebrew and English headers)
    const findColumnIndex = (possibleNames: string[]): number => {
      return headerRow.findIndex((h) =>
        possibleNames.some((name) => String(h || '').trim().toLowerCase().includes(name.toLowerCase()))
      );
    };

    const dayCol = findColumnIndex(['יום', 'day']);
    const dateCol = findColumnIndex(['תאריך', 'date']);
    const titleCol = findColumnIndex(['נושא', 'title', 'topic', 'subject']);
    const lecturerCol = findColumnIndex(['מציג', 'lecturer', 'presenter']);
    const moderatorCol = findColumnIndex(['מנחה', 'moderator']);
    const organizerCol = findColumnIndex(['רכז', 'organizer', 'coordinator']);
    const linkCol = findColumnIndex(['link', 'קישור']);
    const notesCol = findColumnIndex(['notes', 'הערות']);

    // Validate required columns exist
    if (dayCol === -1) errors.push({ row: 0, message: 'Missing required column: יום (day)' });
    if (dateCol === -1) errors.push({ row: 0, message: 'Missing required column: תאריך (date)' });
    if (titleCol === -1) errors.push({ row: 0, message: 'Missing required column: נושא (title)' });
    if (organizerCol === -1) errors.push({ row: 0, message: 'Missing required column: רכז (organizer)' });
    // Note: מציג (lecturer) and מנחה (moderator) are optional columns

    if (errors.length > 0) {
      return { rows: [], errors };
    }

    // Parse data rows (skip header)
    // Track the last valid day and date for carry-forward logic
    let lastDay: string | null = null;
    let lastDate: string | null = null;

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const rowNumber = i + 1;

      // Skip completely empty rows
      if (!row || row.every((cell) => !cell || String(cell).trim() === '')) {
        continue;
      }

      // Extract raw values (keep date as original type - number or string)
      let dayOfWeekRaw = row[dayCol] !== undefined && row[dayCol] !== null ? String(row[dayCol]).trim() : '';
      let dateRaw = row[dateCol]; // Keep original type (number for Excel serial, string for DD/MM/YYYY)
      const title = String(row[titleCol] || '').trim();
      const lecturer = lecturerCol !== -1 ? String(row[lecturerCol] || '').trim() : '';
      const moderator = moderatorCol !== -1 ? String(row[moderatorCol] || '').trim() : '';
      const organizer = String(row[organizerCol] || '').trim();
      const link = linkCol !== -1 ? String(row[linkCol] || '').trim() : '';
      const notes = notesCol !== -1 ? String(row[notesCol] || '').trim() : '';

      // CARRY-FORWARD LOGIC: If day/date are empty, use last valid ones
      if (!dayOfWeekRaw && lastDay) {
        dayOfWeekRaw = lastDay;
      }
      if ((!dateRaw || dateRaw === '' || dateRaw === null) && lastDate) {
        dateRaw = lastDate;
      }

      // Convert dateRaw to string for storage
      let dateStr: string;
      try {
        if (typeof dateRaw === 'number') {
          // Excel serial number - convert to DD/MM/YYYY format
          const excelEpoch = new Date(Date.UTC(1899, 11, 30));
          const date = new Date(excelEpoch.getTime() + dateRaw * 86400000);
          const day = String(date.getUTCDate()).padStart(2, '0');
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const year = date.getUTCFullYear();
          dateStr = `${day}/${month}/${year}`;
        } else if (typeof dateRaw === 'string') {
          // Already a string (from manual entry or carry-forward)
          dateStr = dateRaw.trim();
        } else {
          dateStr = '';
        }
      } catch (error) {
        dateStr = '';
      }

      // Validate required fields only (day, date, title)
      if (!dayOfWeekRaw) {
        errors.push({ 
          row: rowNumber, 
          message: lastDay 
            ? `Missing day of week (יום). Previous day was: ${lastDay}` 
            : 'Missing day of week (יום). No previous day to inherit from.' 
        });
      }
      if (!dateStr) {
        errors.push({ 
          row: rowNumber, 
          message: lastDate 
            ? `Missing date (תאריך). Previous date was: ${lastDate}` 
            : 'Missing date (תאריך). No previous date to inherit from.' 
        });
      }
      if (!title) errors.push({ row: rowNumber, message: 'Missing title (נושא)' });
      // Note: lecturer (מציג), moderator (מנחה), and organizer (רכז) are all optional

      // Update carry-forward values for next iteration (if valid)
      if (dayOfWeekRaw) lastDay = dayOfWeekRaw;
      if (dateStr) lastDate = dateStr;

      rows.push({
        dayOfWeek: dayOfWeekRaw,
        date: dateStr,
        title,
        lecturer: lecturer || undefined,
        moderator: moderator || undefined,
        organizer: organizer || undefined,
        link: link || undefined,
        notes: notes || undefined,
      });
    }

    return { rows, errors };
  } catch (error) {
    errors.push({
      row: 0,
      message: `Failed to parse Excel file: ${error instanceof Error ? error.message : String(error)}`,
    });
    return { rows: [], errors };
  }
}

/**
 * Parse date from Excel
 * Supports: DD/MM/YYYY format or Excel date serial numbers
 */
export function parseExcelDate(input: string | number): Date | null {
  if (!input) return null;

  // If it's a number, it's likely an Excel date serial
  if (typeof input === 'number') {
    // Excel dates are days since 1900-01-01 (with a leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + input * 86400000);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  // Try DD/MM/YYYY format
  const str = String(input).trim();
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;

  const dd = parseInt(m[1]!, 10);
  const mm = parseInt(m[2]!, 10) - 1;
  const yyyy = parseInt(m[3]!, 10);
  const d = new Date(Date.UTC(yyyy, mm, dd, 0, 0, 0));
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Validate URL
 */
export function isBasicUrl(url: string): boolean {
  if (!url) return true;
  try {
    const u = new URL(url);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
}

/**
 * Validate Hebrew day of week
 */
export function isValidHebrewDay(day: string): boolean {
  const validDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
  return validDays.includes(day.trim());
}

