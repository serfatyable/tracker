import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

import { initializeFirebaseAdmin } from '@/lib/firebase/admin-init';
import { rateLimiters, checkRateLimit, getClientIdentifier } from '@/lib/middleware/rateLimit';

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
    // Interpret Excel serial as days since 1899-12-30 in UTC (handles Excel's 1900 system)
    const EXCEL_EPOCH_UTC_MS = Date.UTC(1899, 11, 30);
    const MS_PER_DAY = 86400000;
    return new Date(EXCEL_EPOCH_UTC_MS + Math.round(serial) * MS_PER_DAY);
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

    // Include original row number to surface precise validation errors to the client
    rows.push({ rowNumber: rowNum, date: parsedDate, dayOfWeek, shifts });
  }

  return { rows, errors };
}

// Firebase Admin initialization moved to shared utility

export async function POST(request: Request) {
  try {
    // Initialize Firebase Admin
    initializeFirebaseAdmin();

    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { errorCode: 'MISSING_AUTH', error: 'MISSING_AUTH' },
        { status: 401 },
      );
    }

    // Flags via query params
    const url = new URL(request.url);
    const deferUnknown = url.searchParams.get('deferUnknown') === 'true';

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await getAuth().verifyIdToken(token!);
    const uid = decodedToken.uid;

    // ✅ RATE LIMITING: Prevent import resource exhaustion
    const identifier = getClientIdentifier(request, uid);
    const rateLimitResponse = await checkRateLimit(identifier, rateLimiters?.adminImport ?? null);
    if (rateLimitResponse) {
      return rateLimitResponse; // 429 Too Many Requests
    }

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
      rows.map((r) => `${r.date.getUTCFullYear()}-${r.date.getUTCMonth()}`),
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

    // Build a normalized name -> users map for uid resolution
    const normalizeName = (s: string) => {
      const normalized = String(s || '')
        .normalize('NFD')
        .replace(/\p{M}/gu, '') // remove diacritics (including Hebrew niqqud)
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u200E\u200F]/g, '') // strip LRM/RLM
        .toLowerCase();
      const tokens = normalized.split(/\s+/).filter(Boolean);
      // Use last token (family name) for matching
      return tokens.length > 0 ? tokens[tokens.length - 1] || normalized : normalized;
    };

    // Fetch all users (across roles) to match names
    const usersSnap = await adminDb.collection('users').get();
    const userByName = new Map<
      string,
      Array<{ uid: string; fullName: string; role?: string; status?: string }>
    >();
    usersSnap.docs.forEach((d) => {
      const u = d.data() as any;
      const uid = d.id;
      const enName = String(u.fullName || '').trim();
      const heName = String(u.fullNameHe || '').trim();
      const add = (name: string) => {
        if (!name) return;
        const key = normalizeName(name);
        const arr = userByName.get(key) || [];
        // keep canonical fullName for display; if only Hebrew provided, fallback to that
        arr.push({ uid, fullName: enName || heName, role: u.role, status: u.status });
        userByName.set(key, arr);
      };
      add(enName);
      add(heName);
    });

    // Validate all referenced names are resolvable to a unique uid
    const importValidationErrors: string[] = [];
    for (const dayData of rows) {
      for (const [_, personName] of Object.entries(dayData.shifts as Record<string, string>)) {
        if (!personName || typeof personName !== 'string') continue;
        const key = normalizeName(personName);
        const matches = userByName.get(key) || [];
        if (matches.length === 0) {
          // UNKNOWN_USER:<row>
          if (!deferUnknown) importValidationErrors.push(`UNKNOWN_USER:${dayData.rowNumber}`);
        } else if (matches.length > 1) {
          // Try auto-resolve: exactly one active resident
          const narrowed = matches.filter((m) => m.role === 'resident' && m.status === 'active');
          if (narrowed.length === 1) {
            continue; // acceptable
          }
          // AMBIGUOUS_USER:<row>
          importValidationErrors.push(`AMBIGUOUS_USER:${dayData.rowNumber}`);
        }
      }
    }

    if (importValidationErrors.length > 0) {
      return NextResponse.json({ errors: importValidationErrors }, { status: 400 });
    }

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
      const y = date.getUTCFullYear();
      const m = date.getUTCMonth();
      const d = date.getUTCDate();
      const dateKey = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

      // Convert shifts to stations format
      const stations: Record<string, { userId: string; userDisplayName: string }> = {};

      for (const [hebrewShift, personName] of Object.entries(
        dayData.shifts as Record<string, string>,
      )) {
        const stationKey = shiftToStationKey[hebrewShift];
        if (stationKey && typeof personName === 'string' && personName.trim()) {
          const key = normalizeName(personName);
          const matches = userByName.get(key) || [];
          // Prefer unique active resident if ambiguous
          const narrowed = matches.filter((m) => m.role === 'resident' && m.status === 'active');
          if (matches.length === 0 && deferUnknown) {
            // Store unresolved name; backfill will resolve later
            stations[stationKey] = {
              userId: personName.trim(),
              userDisplayName: personName.trim(),
            };
          } else if (matches.length > 0) {
            const chosen = (narrowed.length === 1 ? narrowed[0] : matches[0])!;
            const { uid, fullName } = chosen;
            stations[stationKey] = {
              userId: uid,
              userDisplayName: fullName || personName.trim(),
            };
          }
        }
      }

      // Create one document per day with all stations
      const docRef = adminDb.collection('onCallDays').doc(dateKey);

      await docRef.set({
        dateKey: dateKey,
        // Normalize stored date to UTC midnight for the given calendar day
        date: new Date(Date.UTC(y, m, d)),
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
