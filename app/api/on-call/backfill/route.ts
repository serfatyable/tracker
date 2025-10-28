import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

import { initializeFirebaseAdmin } from '@/lib/firebase/admin-init';

// Normalize helper shared with import route logic (duplicated minimally to avoid coupling)
function normalizeName(s: string): string {
  const normalized = String(s || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // remove diacritics
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200E\u200F]/g, '')
    .toLowerCase();
  const tokens = normalized.split(/\s+/).filter(Boolean);
  // Use last token (family name) for matching
  return tokens.length > 0 ? tokens[tokens.length - 1] || normalized : normalized;
}

export async function POST(request: Request) {
  try {
    initializeFirebaseAdmin();

    // Verify auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { errorCode: 'MISSING_AUTH', error: 'MISSING_AUTH' },
        { status: 401 },
      );
    }
    const token = authHeader.split('Bearer ')[1]!;
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const db = getFirestore();
    const meSnap = await db.collection('users').doc(uid).get();
    if (!meSnap.exists || (meSnap.data() as any)?.role !== 'admin') {
      return NextResponse.json(
        { errorCode: 'ADMIN_REQUIRED', error: 'ADMIN_REQUIRED' },
        { status: 403 },
      );
    }

    const url = new URL(request.url);
    const dryRun = url.searchParams.get('dryRun') === 'true';
    const mode = url.searchParams.get('mode') || 'resolveNames';
    
    // Optional: date shift backfill for month (fix off-by-one)
    if (mode === 'dateShift') {
      const month = url.searchParams.get('month'); // YYYY-MM
      const deltaDays = parseInt(url.searchParams.get('deltaDays') || '1', 10) || 1;
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        return NextResponse.json(
          { errorCode: 'INVALID_MONTH', error: 'month must be YYYY-MM' },
          { status: 400 },
        );
      }

      const [yyyyStr, mmStr] = month.split('-');
      const yyyy = parseInt(yyyyStr!, 10);
      const mm = parseInt(mmStr!, 10) - 1; // 0-based

      // Range to shift: previous month last day .. current month last day - 1
      const firstOfMonthUtc = new Date(Date.UTC(yyyy, mm, 1));
      const lastDayPrevMonthUtc = new Date(firstOfMonthUtc.getTime() - 86400000);
      const firstOfNextMonthUtc = new Date(Date.UTC(yyyy, mm + 1, 1));
      const lastDayCurrentMonthUtc = new Date(firstOfNextMonthUtc.getTime() - 86400000);
      const endRangeUtc = new Date(lastDayCurrentMonthUtc.getTime() - 86400000); // last - 1

      const fmtKey = (d: Date) =>
        `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      const startKey = fmtKey(lastDayPrevMonthUtc);
      const endKey = fmtKey(endRangeUtc);

      const db2 = getFirestore();
      const snap = await db2
        .collection('onCallDays')
        .where('dateKey', '>=', startKey)
        .where('dateKey', '<=', endKey)
        .get();

      let shifted = 0;
      let collisions = 0;
      const details: Array<{ from: string; to: string }> = [];

      for (const doc of snap.docs) {
        const data = doc.data() as any;
        const parts = String(data.dateKey).split('-').map((p: string) => parseInt(p, 10));
        if (parts.length !== 3 || parts.some((n: number) => !Number.isFinite(n))) continue;
        const srcUtc = new Date(Date.UTC(parts[0]!, parts[1]! - 1, parts[2]!));
        const dstUtc = new Date(srcUtc.getTime() + deltaDays * 86400000);
        const newKey = fmtKey(dstUtc);

        // If not dry-run, copy to new doc and delete old
        if (!dryRun) {
          const targetRef = db2.collection('onCallDays').doc(newKey);
          const targetSnap = await targetRef.get();
          if (targetSnap.exists) collisions++;
          await targetRef.set({
            dateKey: newKey,
            date: new Date(Date.UTC(dstUtc.getUTCFullYear(), dstUtc.getUTCMonth(), dstUtc.getUTCDate())),
            stations: data.stations || {},
            createdAt: data.createdAt || new Date(),
          });
          await doc.ref.delete();
        }

        details.push({ from: data.dateKey, to: newKey });
        shifted++;
      }

      return NextResponse.json({
        success: true,
        mode: 'dateShift',
        month,
        dryRun,
        startKey,
        endKey,
        deltaDays,
        examined: snap.size,
        shifted,
        collisions,
        details,
      });
    }

    // Default mode: resolveNames backfill
    // Build users map
    const userByName = new Map<
      string,
      Array<{ uid: string; fullName: string; role?: string; status?: string }>
    >();
    const usersSnap = await db.collection('users').get();
    usersSnap.docs.forEach((d) => {
      const data = d.data() as any;
      const enName = String(data.fullName || '').trim();
      const heName = String(data.fullNameHe || '').trim();
      const add = (name: string) => {
        if (!name) return;
        const key = normalizeName(name);
        const arr = userByName.get(key) || [];
        arr.push({ uid: d.id, fullName: enName || heName, role: data.role, status: data.status });
        userByName.set(key, arr);
      };
      add(enName);
      add(heName);
    });

    // Iterate existing onCallDays
    const daysSnap = await db.collection('onCallDays').get();
    let examined = 0;
    let updated = 0;
    const unknowns: Array<{ id: string; stationKey: string; name: string }> = [];
    const ambiguous: Array<{ id: string; stationKey: string; name: string; matches: number }> = [];

    for (const doc of daysSnap.docs) {
      const data = doc.data() as any;
      const stations = (data.stations || {}) as Record<
        string,
        { userId: string; userDisplayName: string }
      >;
      let changed = false;
      const newStations: Record<string, { userId: string; userDisplayName: string }> = {
        ...stations,
      };
      for (const [stationKey, entry] of Object.entries(stations)) {
        const currentUserId = entry.userId;
        // If current userId corresponds to an existing users/{uid} doc, skip
        const userDoc = await db.collection('users').doc(currentUserId).get();
        if (userDoc.exists) continue;

        // Treat userId as a display name that needs mapping
        const candidateName = entry.userDisplayName || currentUserId;
        const key = normalizeName(candidateName);
        const matches = userByName.get(key) || [];
        if (matches.length === 1) {
          newStations[stationKey] = {
            userId: matches[0]!.uid,
            userDisplayName: matches[0]!.fullName,
          };
          changed = true;
        } else if (matches.length === 0) {
          unknowns.push({ id: doc.id, stationKey, name: candidateName });
        } else {
          const narrowed = matches.filter((m) => m.role === 'resident' && m.status === 'active');
          if (narrowed.length === 1) {
            newStations[stationKey] = {
              userId: narrowed[0]!.uid,
              userDisplayName: narrowed[0]!.fullName,
            };
            changed = true;
          } else {
            ambiguous.push({
              id: doc.id,
              stationKey,
              name: candidateName,
              matches: matches.length,
            });
          }
        }
      }

      examined++;
      if (changed && !dryRun) {
        await doc.ref.update({ stations: newStations });
        updated++;
      } else if (changed && dryRun) {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      examined,
      updated,
      unknowns,
      ambiguous,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
