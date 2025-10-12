import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { getFirebaseApp } from '../../../../lib/firebase/client';
import { buildOnCallIcs } from '../../../../lib/ics/buildOnCallIcs';

function isApproved(profile: any): boolean {
  return profile && profile.status === 'approved';
}

export async function GET(req: NextRequest) {
  try {
    const app = getFirebaseApp();
    const db = getFirestore(app);
    const uid = req.headers.get('x-user-uid');
    if (!uid) return new NextResponse('unauthenticated', { status: 401 });
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists() || !isApproved(userSnap.data())) return new NextResponse('forbidden', { status: 403 });

    const user = userSnap.data() as any;
    const now = new Date();
    const col = collection(db, 'onCallAssignments');
    const q = query(col, where('userId', '==', uid), where('endAt', '>=', now), orderBy('userId'), orderBy('startAt'));
    const snap = await getDocs(q);
    const assignments = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const ics = buildOnCallIcs(assignments as any, user.fullName || user.email);
    return new NextResponse(ics, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'attachment; filename="on-call.ics"',
      },
    });
  } catch (e: any) {
    return new NextResponse(String(e?.message || e), { status: 500 });
  }
}


