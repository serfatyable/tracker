import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, getDocs, query, where, Timestamp as FBTimestamp, doc, getDoc, writeBatch, setDoc } from 'firebase/firestore';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { parseOnCallCsv, buildAssignments } from '../../../../lib/on-call/import';
import type { StationKey } from '../../../../types/onCall';

function isAdminProfile(profile: any): boolean {
  return profile && profile.role === 'admin' && profile.status === 'approved';
}

export async function POST(req: NextRequest) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const uid = req.headers.get('x-user-uid');
    if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists() || !isAdminProfile(userSnap.data()))
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const dryRun = url.searchParams.get('dryRun') === '1' || req.headers.get('x-dry-run') === '1';
    const contentType = req.headers.get('content-type') || '';

    let csvText = '';
    let resolutions: Record<string, string> | undefined; // raw name -> userId
    let saveAliases = false;
    if (contentType.includes('application/json')) {
      const body = await req.json();
      csvText = String(body.csv || '');
      resolutions = body.resolutions || undefined;
      saveAliases = !!body.saveAliases;
    } else {
      csvText = await req.text();
    }
    if (!csvText.trim()) return NextResponse.json({ imported: 0, errors: ['empty file'] }, { status: 400 });

    const { rows } = parseOnCallCsv(csvText);
    if (!rows.length) return NextResponse.json({ imported: 0, errors: ['no valid rows'] }, { status: 400 });

    const [usersSnap, aliasesSnap] = await Promise.all([
      getDocs(query(collection(db, 'users'))),
      getDocs(query(collection(db, 'onCallAliases'))),
    ]);
    const users = usersSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const aliasMap = new Map<string, { userId: string; userDisplayName: string }>();
    for (const d of aliasesSnap.docs) {
      const data = d.data() as any;
      aliasMap.set(String(d.id).toLowerCase(), { userId: data.userId, userDisplayName: data.userDisplayName });
    }

    function resolveName(raw: string): { userId?: string; userDisplayName?: string } {
      const key = (raw || '').trim().toLowerCase();
      if (!key) return {};
      const alias = aliasMap.get(key);
      if (alias) return alias;
      const byEmail = users.find((u) => String(u.email || '').trim().toLowerCase() === key);
      if (byEmail) return { userId: byEmail.id, userDisplayName: byEmail.fullName || byEmail.email };
      const byName = users.find((u) => String(u.fullName || '').trim().toLowerCase() === key);
      if (byName) return { userId: byName.id, userDisplayName: byName.fullName || byName.email };
      if (resolutions && resolutions[key]) {
        const chosen = users.find((u) => u.id === resolutions![key]);
        if (chosen) return { userId: chosen.id, userDisplayName: chosen.fullName || chosen.email };
      }
      return {};
    }

    const { assignments, unresolved } = buildAssignments({ rows, nameToUser: resolveName, createdBy: uid });

    // If dryRun, return preview without writing
    if (dryRun) {
      return NextResponse.json({ imported: 0, preview: { assignments: assignments.length, unresolved } });
    }

    // Commit: write assignments and per-day snapshots, and optionally new aliases
    const batch = writeBatch(db);
    // Save aliases for provided resolutions
    if (resolutions && saveAliases) {
      Object.entries(resolutions).forEach(([rawName, userId]) => {
        const key = rawName.trim().toLowerCase();
        if (!aliasMap.has(key) && userId) {
          const u = users.find((x) => x.id === userId);
          if (u) batch.set(doc(db, 'onCallAliases', key), { userId, userDisplayName: u.fullName || u.email });
        }
      });
    }

    // Write assignments
    for (const a of assignments) {
      batch.set(doc(db, 'onCallAssignments', a.id!), a as any);
    }
    // Build and write per-day snapshots
    const byDate = new Map<string, Record<StationKey, { userId: string; userDisplayName: string }>>();
    for (const a of assignments) {
      const map = byDate.get(a.dateKey) || ({} as any);
      (map as any)[a.stationKey] = { userId: a.userId, userDisplayName: a.userDisplayName };
      byDate.set(a.dateKey, map);
    }
    for (const [dateKey, stations] of byDate.entries()) {
      const parts = dateKey.split('-').map((p) => parseInt(p, 10));
      const date = new Date(Date.UTC(parts[0] as number, (parts[1] as number) - 1, parts[2] as number, 0, 0, 0));
      batch.set(doc(db, 'onCallDays', dateKey), {
        id: dateKey,
        dateKey,
        date: FBTimestamp.fromDate(date),
        stations,
        createdAt: FBTimestamp.now(),
      } as any);
    }

    await batch.commit();
    return NextResponse.json({ imported: assignments.length, unresolved: [] });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}


