import * as XLSX from 'xlsx';

export type ExamExcelRow = {
  rowNumber: number; // Original row number in Excel
  titleEn: string; // Title (EN) - required
  titleHe: string; // Title (HE) - required
  examDate: string; // DD/MM/YYYY - required
  examLink?: string; // URL - optional
  topics: string; // Comma-separated - required
  bookChapters: string; // Comma-separated - required
  descriptionEn?: string; // Description (EN) - optional
  descriptionHe?: string; // Description (HE) - optional
};

export type ParsedExamGroup = {
  examDate: string; // DD/MM/YYYY
  examLink?: string; // Default link from first subject
  subjects: Array<{
    titleEn: string;
    titleHe: string;
    topics: string;
    bookChapters: string;
    descriptionEn?: string;
    descriptionHe?: string;
    examLink?: string; // Optional separate link per subject
  }>;
};

export type ParsedExamsResult = {
  exams: ParsedExamGroup[]; // Grouped by date
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ examDate: string; subjectCount: number; message: string }>; // For >2 subjects per date
  duplicates: Array<{ examDate: string }>; // Duplicate exam dates
};

/**
 * Parse Excel file for bulk exam import
 * Required columns: Title (EN), Title (HE), Exam Date, Topics, Book Chapters
 * Optional columns: Exam Link, Description (EN), Description (HE)
 *
 * Date format: DD/MM/YYYY
 * Multiple rows with the same date will be grouped as subjects under one exam (max 2 recommended)
 */
export function parseExamsExcel(
  buffer: ArrayBuffer,
  existingExams: Array<{ examDate: Date }>,
): ParsedExamsResult {
  const errors: Array<{ row: number; message: string }> = [];
  const warnings: Array<{ examDate: string; subjectCount: number; message: string }> = [];
  const duplicates: Array<{ examDate: string }> = [];
  const rows: ExamExcelRow[] = [];

  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0] as string];
    if (!firstSheet) {
      errors.push({ row: 0, message: 'No sheet found in Excel file' });
      return { exams: [], errors, warnings, duplicates };
    }

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

    if (jsonData.length < 2) {
      errors.push({
        row: 0,
        message: 'Excel file must have at least a header row and one data row',
      });
      return { exams: [], errors, warnings, duplicates };
    }

    const headerRow = jsonData[0] as string[];

    // Find column indices (support both English and Hebrew headers)
    const findColumnIndex = (possibleNames: string[]): number => {
      return headerRow.findIndex((h) =>
        possibleNames.some((name) =>
          String(h || '')
            .trim()
            .toLowerCase()
            .includes(name.toLowerCase()),
        ),
      );
    };

    const titleEnCol = findColumnIndex(['title (en)', 'title en', 'title_en', 'english title']);
    const titleHeCol = findColumnIndex([
      'title (he)',
      'title he',
      'title_he',
      'hebrew title',
      'כותרת',
    ]);
    const examDateCol = findColumnIndex(['exam date', 'date', 'תאריך', 'exam_date']);
    const examLinkCol = findColumnIndex(['exam link', 'link', 'url', 'קישור']);
    const topicsCol = findColumnIndex(['topics', 'נושאים', 'topic']);
    const chaptersCol = findColumnIndex(['book chapters', 'chapters', 'פרקים', 'book_chapters']);
    const descEnCol = findColumnIndex([
      'description (en)',
      'description en',
      'desc en',
      'description_en',
    ]);
    const descHeCol = findColumnIndex([
      'description (he)',
      'description he',
      'desc he',
      'description_he',
      'תיאור',
    ]);

    // Validate required columns exist
    if (titleEnCol === -1) errors.push({ row: 0, message: 'Missing required column: Title (EN)' });
    if (titleHeCol === -1) errors.push({ row: 0, message: 'Missing required column: Title (HE)' });
    if (examDateCol === -1) errors.push({ row: 0, message: 'Missing required column: Exam Date' });
    // Topics and Book Chapters are optional per simplified model

    if (errors.length > 0) {
      return { exams: [], errors, warnings, duplicates };
    }

    // Parse data rows (skip header)
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i] as any[];
      const rowNumber = i + 1;

      // Skip completely empty rows
      if (!row || row.every((cell) => !cell || String(cell).trim() === '')) {
        continue;
      }

      // Extract raw values
      const titleEn = row[titleEnCol] ? String(row[titleEnCol]).trim() : '';
      const titleHe = row[titleHeCol] ? String(row[titleHeCol]).trim() : '';
      const examDateRaw = row[examDateCol];
      const examLink = row[examLinkCol] ? String(row[examLinkCol]).trim() : '';
      const topics = topicsCol !== -1 && row[topicsCol] ? String(row[topicsCol]).trim() : '';
      const bookChapters = chaptersCol !== -1 && row[chaptersCol] ? String(row[chaptersCol]).trim() : '';
      const descriptionEn =
        descEnCol !== -1 && row[descEnCol] ? String(row[descEnCol]).trim() : undefined;
      const descriptionHe =
        descHeCol !== -1 && row[descHeCol] ? String(row[descHeCol]).trim() : undefined;

      // Validate required fields
      if (!titleEn) {
        errors.push({ row: rowNumber, message: 'Title (EN) is required' });
        continue;
      }
      if (!titleHe) {
        errors.push({ row: rowNumber, message: 'Title (HE) is required' });
        continue;
      }
      // Topics and Book Chapters are optional

      // Parse and validate date
      let examDate: string;
      if (typeof examDateRaw === 'number') {
        // Excel serial date
        const jsDate = XLSX.SSF.parse_date_code(examDateRaw);
        examDate = `${String(jsDate.d).padStart(2, '0')}/${String(jsDate.m).padStart(2, '0')}/${jsDate.y}`;
      } else if (typeof examDateRaw === 'string') {
        const s = String(examDateRaw).trim();
        // Support DD/MM or DD/MM/YYYY
        const m1 = s.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
        if (m1) {
          const d = parseInt(m1[1]!, 10);
          const m = parseInt(m1[2]!, 10);
          let y = m1[3] ? parseInt(m1[3]!, 10) : new Date().getFullYear();
          if (y < 100) y += 2000; // handle YY
          const dt = new Date(y, m - 1, d);
          examDate = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
        } else {
          // Fallback to JS Date parser (supports formats like 17-Sep, 06-Nov, etc.)
          const dt = new Date(s);
          if (isNaN(dt.getTime())) {
            errors.push({ row: rowNumber, message: `Invalid date format: "${s}"` });
            continue;
          }
          examDate = `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
        }
      } else {
        errors.push({ row: rowNumber, message: 'Exam Date is required' });
        continue;
      }

      // examDate is already normalized to DD/MM/YYYY at this point

      // Validate URL format if provided
      if (examLink) {
        try {
          new URL(examLink);
        } catch {
          errors.push({ row: rowNumber, message: `Invalid URL: "${examLink}"` });
          continue;
        }
      }

      rows.push({
        rowNumber,
        titleEn,
        titleHe,
        examDate,
        examLink: examLink || undefined,
        topics,
        bookChapters,
        descriptionEn,
        descriptionHe,
      });
    }

    // Group rows by examDate
    const examsByDate = new Map<string, ExamExcelRow[]>();
    for (const row of rows) {
      const existing = examsByDate.get(row.examDate) || [];
      existing.push(row);
      examsByDate.set(row.examDate, existing);
    }

    // Check for duplicates with existing exams (by date only)
    const examDateObj = (dateStr: string) => {
      const [day, month, year] = dateStr.split('/').map((n) => parseInt(n, 10));
      return new Date(year!, month! - 1, day!);
    };

    for (const [dateStr, subjects] of examsByDate.entries()) {
      const dateObj = examDateObj(dateStr);
      const isDuplicate = existingExams.some(
        (existing) => existing.examDate.toDateString() === dateObj.toDateString(),
      );

      if (isDuplicate) {
        duplicates.push({ examDate: dateStr });
      }

      // Warn if more than 2 subjects per date
      if (subjects.length > 2) {
        warnings.push({
          examDate: dateStr,
          subjectCount: subjects.length,
          message: `More than 2 subjects (${subjects.length}) on ${dateStr}. Maximum 2 recommended.`,
        });
      }
    }

    // Create exam groups
    const exams: ParsedExamGroup[] = Array.from(examsByDate.entries()).map(
      ([date, subjectRows]) => {
        // Use first subject's link as default exam link (if exists)
        const defaultLink = subjectRows[0]?.examLink;

        return {
          examDate: date,
          examLink: defaultLink,
          subjects: subjectRows.map((row) => ({
            titleEn: row.titleEn,
            titleHe: row.titleHe,
            topics: row.topics,
            bookChapters: row.bookChapters,
            descriptionEn: row.descriptionEn,
            descriptionHe: row.descriptionHe,
            examLink: row.examLink !== defaultLink ? row.examLink : undefined, // Only set if different from default
          })),
        };
      },
    );

    return { exams, errors, warnings, duplicates };
  } catch (error) {
    console.error('Error parsing Excel:', error);
    errors.push({ row: 0, message: `Failed to parse Excel file: ${error}` });
    return { exams: [], errors, warnings, duplicates };
  }
}

/**
 * Generate sample Excel template for exam import
 * Shows examples including multiple subjects on the same date and optional exam link
 */
export function generateExamsTemplate(): ArrayBuffer {
  const sampleData = [
    {
      'Title (EN)': 'Pharmacology',
      'Title (HE)': 'פרמקולוגיה',
      'Exam Date': '15/01/2025',
      'Exam Link': 'https://forms.google.com/d/e/1FAIpQLSe...',
      Topics: 'Pharmacology, Drug Interactions',
      'Book Chapters': 'Chapter 5, Chapter 6',
      'Description (EN)': 'Pharmacology exam covering chapters 5-6',
      'Description (HE)': 'מבחן פרמקולוגיה על פרקים 5-6',
    },
    {
      'Title (EN)': 'Pain Management',
      'Title (HE)': 'ניהול כאב',
      'Exam Date': '15/01/2025',
      'Exam Link': '', // Optional - empty means use default link from first subject
      Topics: 'Pain Management, Opioids',
      'Book Chapters': 'Chapter 7, Chapter 8',
      'Description (EN)': 'Pain management exam covering chapters 7-8',
      'Description (HE)': 'מבחן ניהול כאב על פרקים 7-8',
    },
    {
      'Title (EN)': 'Airway Management',
      'Title (HE)': 'ניהול דרכי אוויר',
      'Exam Date': '22/01/2025',
      'Exam Link': 'https://forms.google.com/d/e/1FAIpQLSe...',
      Topics: 'Airway Management, Intubation',
      'Book Chapters': 'Chapter 12',
      'Description (EN)': 'Airway management techniques',
      'Description (HE)': 'טכניקות ניהול דרכי אוויר',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Exams');

  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}
