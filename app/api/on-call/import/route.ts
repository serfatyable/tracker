import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

// Server-side Excel parsing
async function parseOnCallExcelServer(buffer: ArrayBuffer) {
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

  const rows: any[] = [];
  const errors: any[] = [];

  function parseExcelDate(serial: number): Date {
    const EXCEL_EPOCH = new Date(1899, 11, 30);
    const MS_PER_DAY = 86400000;
    return new Date(EXCEL_EPOCH.getTime() + serial * MS_PER_DAY);
  }

  function parseDateString(dateStr: string): Date {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]!, 10);
      const month = parseInt(parts[1]!, 10) - 1;
      const year = parseInt(parts[2]!, 10);
      return new Date(year, month, day);
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      throw new Error(`Cannot parse date: ${dateStr}`);
    }
    return date;
  }

  // Start from row 3 (index 2) - rows 1-2 are headers
  for (let i = 2; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const rowNum = i + 1;
    const dateRaw = row[1];

    if (!dateRaw) continue; // Empty row

    let parsedDate: Date;
    try {
      if (typeof dateRaw === 'number') {
        parsedDate = parseExcelDate(dateRaw);
      } else if (dateRaw instanceof Date) {
        parsedDate = dateRaw;
      } else if (typeof dateRaw === 'string') {
        parsedDate = parseDateString(dateRaw);
      } else {
        errors.push({ row: rowNum, message: `Invalid date: ${dateRaw}` });
        continue;
      }

      if (isNaN(parsedDate.getTime())) {
        errors.push({ row: rowNum, message: 'Invalid date value' });
        continue;
      }
    } catch (error) {
      errors.push({ row: rowNum, message: `Date error: ${error}` });
      continue;
    }

    const shifts: Record<string, string> = {};
    for (const [colIdx, shiftType] of Object.entries(SHIFT_COLUMNS)) {
      const value = row[parseInt(colIdx)];
      if (value && typeof value === 'string' && value.trim() !== '') {
        shifts[shiftType] = value.trim();
      }
    }

    const dayOfWeek = row[0] && typeof row[0] === 'string' ? row[0] : undefined;

    rows.push({ date: parsedDate, dayOfWeek, shifts });
  }

  return { rows, errors };
}

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { errorCode: 'MISSING_AUTH', error: 'MISSING_AUTH' },
        { status: 401 },
      );
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token!);
    const uid = decodedToken.uid;

    // Check if user is admin
    const adminDb = getFirestore();
    const userDoc = await adminDb.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { errorCode: 'ADMIN_REQUIRED', error: 'ADMIN_REQUIRED' },
        { status: 403 },
      );
    }

    // Parse the Excel file
    const buffer = await request.arrayBuffer();

    // File size limit: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (buffer.byteLength === 0) {
      return NextResponse.json({ errorCode: 'EMPTY_FILE', error: 'EMPTY_FILE' }, { status: 400 });
    }
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        { errorCode: 'FILE_TOO_LARGE', error: 'FILE_TOO_LARGE' },
        { status: 400 },
      );
    }

    const { rows, errors } = await parseOnCallExcelServer(buffer);

    if (errors.length > 0) {
      return NextResponse.json(
        { errors: errors.map((e) => `Row ${e.row}: ${e.message}`) },
        { status: 400 },
      );
    }

    if (rows.length === 0) {
      return NextResponse.json({ errorCode: 'NO_DATA', error: 'NO_DATA' }, { status: 400 });
    }

    // Get all unique months from the upload
    const monthsToReplace = new Set(
      rows.map((r) => `${r.date.getFullYear()}-${r.date.getMonth()}`),
    );

    // Delete existing shifts for those months
    const deletePromises = Array.from(monthsToReplace).map(async (monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      const startKey = `${year}-${String(month! + 1).padStart(2, '0')}-01`;
      const endKey = `${year}-${String(month! + 1).padStart(2, '0')}-31`;

      const snapshot = await adminDb
        .collection('onCallDays')
        .where('dateKey', '>=', startKey)
        .where('dateKey', '<=', endKey)
        .get();

      const batch = adminDb.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      return snapshot.size;
    });

    await Promise.all(deletePromises);

    // Create new shifts
    let totalShifts = 0;

    // Mapping from Hebrew shift names to station keys
    const shiftToStationKey: Record<string, string> = {
      'ת.חדר ניתוח': 'or_main',
      'ת. חדר לידה': 'labor_delivery',
      'תורן טיפול נמרץ': 'icu',
      'ת.חדר ניתוח נשים': 'or_gyne',
      'תורן PACU': 'pacu',
      'מנהל תורן': 'on_call_manager',
      'תורן חנ בכיר': 'senior_or',
      'תורן חצי חנ בכיר': 'senior_or_half',
      כונן: 'on_call_manager', // Map to on_call_manager for now
      'תורן שליש': 'on_call_manager', // Map to on_call_manager for now
      'כיסוי טפנץ': 'spine',
      'עובד נוסף': 'on_call_manager', // Map to on_call_manager for now
      'אורתו שצי': 'ortho_shatzi',
      'אורתו טראומה': 'ortho_trauma',
      'אורתו מפרק': 'ortho_joint',
      SUR: 'surgery',
      Urol: 'urology',
      'עמ"ש': 'spine',
      'כלי דם / חזה': 'vascular_thoracic',
      כאב: 'pain_service',
      'זריקות עמ"ש': 'spine_injections',
      'יום מנוחה שבועי': 'weekly_day_off',
    };

    for (const dayData of rows) {
      const date = dayData.date;
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      // Convert shifts to stations format
      const stations: Record<string, { userId: string; userDisplayName: string }> = {};

      for (const [hebrewShift, personName] of Object.entries(dayData.shifts)) {
        const stationKey = shiftToStationKey[hebrewShift];
        if (stationKey && typeof personName === 'string' && personName.trim()) {
          // For now, use the person name as both userId and userDisplayName
          // In a real system, you'd want to look up the actual user ID
          stations[stationKey] = {
            userId: personName.trim(), // This should be looked up from users collection
            userDisplayName: personName.trim(),
          };
        }
      }

      // Create one document per day with all stations
      const docRef = adminDb.collection('onCallDays').doc(dateKey);

      await docRef.set({
        dateKey: dateKey,
        date: date,
        stations: stations,
        createdAt: new Date(),
      });

      totalShifts += Object.keys(stations).length;
    }

    return NextResponse.json({
      success: true,
      imported: rows.length,
      totalShifts: totalShifts,
      months: Array.from(monthsToReplace).length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
