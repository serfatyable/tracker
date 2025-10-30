import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdminAuth, createAuthErrorResponse } from '../../../../lib/api/auth';
import { getAdminApp } from '../../../../lib/firebase/admin-sdk';
import {
  rateLimiters,
  checkRateLimit,
  getClientIdentifier,
} from '../../../../lib/middleware/rateLimit';
import {
  parseMorningMeetingsExcel,
  parseExcelDate,
  isBasicUrl,
  isValidHebrewDay,
} from '../../../../lib/morning-meetings/excel';

/**
 * Import morning meetings from Excel file
 *
 * SECURITY: Requires admin authentication via Firebase ID token
 * SECURITY: Rate limiting prevents import abuse (10 imports per hour per admin)
 *
 * @route POST /api/morning-meetings/import
 * @auth Required - Admin only
 */
export async function POST(req: NextRequest) {
  // ✅ SECURE: Verify Firebase ID token and admin role
  try {
    const auth = await requireAdminAuth(req);
    const uid = auth.uid;

    // ✅ RATE LIMITING: Prevent import resource exhaustion
    const identifier = getClientIdentifier(req, uid);
    const rateLimitResponse = await checkRateLimit(identifier, rateLimiters?.adminImport ?? null);
    if (rateLimitResponse) {
      return rateLimitResponse; // 429 Too Many Requests
    }

    // Use Admin SDK for server-side operations (bypasses security rules)
    const { getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore');
    const app = getAdminApp();
    const db = getFirestore(app);

    // Read Excel file as ArrayBuffer
    const buffer = await req.arrayBuffer();
    if (!buffer || buffer.byteLength === 0) {
      return NextResponse.json(
        { imported: 0, errorCode: 'EMPTY_FILE', errors: ['EMPTY_FILE'] },
        { status: 400 },
      );
    }

    // File size limit: 10MB
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (buffer.byteLength > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          imported: 0,
          errorCode: 'FILE_TOO_LARGE',
          errors: ['FILE_TOO_LARGE'],
        },
        { status: 400 },
      );
    }

    // Parse Excel file
    const { rows, errors: parseErrors } = parseMorningMeetingsExcel(buffer);

    if (parseErrors.length > 0 && rows.length === 0) {
      return NextResponse.json(
        {
          imported: 0,
          errors: parseErrors.map((e) => `Row ${e.row}: ${e.message}`),
        },
        { status: 400 },
      );
    }

    if (!rows.length) {
      return NextResponse.json(
        { imported: 0, errorCode: 'NO_DATA', errors: ['NO_DATA'] },
        { status: 400 },
      );
    }

    // Validate and process rows
    const parsed: Array<{
      date: Date;
      dayOfWeek: string;
      title: string;
      lecturer: string;
      moderator: string;
      organizer: string;
      link?: string;
      notes?: string;
    }> = [];
    const monthKeys = new Set<string>();
    const errors: string[] = [...parseErrors.map((e) => `Row ${e.row}: ${e.message}`)];

    rows.forEach((r, idx) => {
      const line = idx + 2; // +1 for header, +1 for 1-based indexing

      // Validate day of week
      if (!isValidHebrewDay(r.dayOfWeek)) {
        errors.push(`INVALID_DAY:${line}:${r.dayOfWeek}`);
      }

      // Parse and validate date
      const d = parseExcelDate(r.date);
      if (!d) {
        errors.push(`INVALID_DATE:${line}:${r.date}`);
      }

      // Validate required fields (only title)
      if (!r.title) errors.push(`TITLE_REQUIRED:${line}`);
      // Note: lecturer (מציג), moderator (מנחה), and organizer (רכז) are all optional

      // Validate link if provided
      if (r.link && !isBasicUrl(r.link)) {
        errors.push(`INVALID_URL:${line}:${r.link}`);
      }

      // Track month
      if (d) {
        monthKeys.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
        parsed.push({
          date: d,
          dayOfWeek: r.dayOfWeek,
          title: r.title,
          lecturer: r.lecturer || '',
          moderator: r.moderator || '',
          organizer: r.organizer || '',
          link: r.link,
          notes: r.notes,
        });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json({ imported: 0, errors }, { status: 400 });
    }

    // Get all unique months from the upload
    // Importing meetings for multiple months...

    // Preload users for lecturer match by email or displayName
    const allUsersSnap = await db.collection('users').get();
    const users = allUsersSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Array<{
      id: string;
      email?: string;
      fullName?: string;
    }>;

    function resolveLecturer(p: { lecturer: string }): { userId?: string; email?: string } {
      const key = (p.lecturer || '').trim().toLowerCase();
      if (!key) return {};
      const byEmail = users.find(
        (u) =>
          String(u.email || '')
            .trim()
            .toLowerCase() === key,
      );
      if (byEmail) return { userId: byEmail.id, email: byEmail.email };
      const byName = users.find(
        (u) =>
          String(u.fullName || '')
            .trim()
            .toLowerCase() === key,
      );
      if (byName) return { userId: byName.id, email: byName.email };
      return {};
    }

    // Delete all existing meetings for affected months
    let totalDeleted = 0;

    for (const monthKey of monthKeys) {
      const [year, month] = monthKey.split('-').map(Number);
      const startKey = `${year}-${String(month! + 1).padStart(2, '0')}-01`;
      const endKey = `${year}-${String(month! + 1).padStart(2, '0')}-31`;

      const snapshot = await db
        .collection('morningMeetings')
        .where('dateKey', '>=', startKey)
        .where('dateKey', '<=', endKey)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      totalDeleted += snapshot.size;
    }

    // Create new meetings
    const batch = db.batch();

    for (const p of parsed) {
      // 07:10–07:50 Asia/Jerusalem: store as UTC timestamps from date base
      const start = new Date(
        Date.UTC(p.date.getUTCFullYear(), p.date.getUTCMonth(), p.date.getUTCDate(), 4, 10, 0),
      );
      const end = new Date(
        Date.UTC(p.date.getUTCFullYear(), p.date.getUTCMonth(), p.date.getUTCDate(), 4, 50, 0),
      );
      const dateKey = `${p.date.getUTCFullYear()}-${String(p.date.getUTCMonth() + 1).padStart(2, '0')}-${String(p.date.getUTCDate()).padStart(2, '0')}`;
      const match = resolveLecturer(p);

      // Generate slug from title for document ID
      const slug = p.title
        .toLowerCase()
        .replace(/[^a-z0-9\u0590-\u05FF\s.-]/g, '')
        .trim()
        .replace(/\s+/g, '_')
        .replace(/\.+/g, '.')
        .replace(/_+/g, '_');

      const docId = `${dateKey}-${slug}`;
      const docRef = db.collection('morningMeetings').doc(docId);

      batch.set(docRef, {
        date: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        dateKey,
        dayOfWeek: p.dayOfWeek,
        title: p.title,
        lecturer: p.lecturer || null,
        moderator: p.moderator || null,
        organizer: p.organizer || null,
        link: p.link || null,
        notes: p.notes || null,
        lecturerUserId: match.userId || null,
        lecturerEmailResolved: match.email || null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    return NextResponse.json({
      imported: parsed.length,
      deleted: totalDeleted,
      months: monthKeys.size,
      errors: [],
    });
  } catch (error) {
    // Handle authentication errors
    if (
      error instanceof Error &&
      (error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('Forbidden'))
    ) {
      return createAuthErrorResponse(error);
    }
    // Handle other errors
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Import failed' },
      { status: 500 },
    );
  }
}
