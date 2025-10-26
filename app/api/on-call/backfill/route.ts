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
