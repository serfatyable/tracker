import { NextResponse, type NextRequest } from 'next/server';

import { createAuthErrorResponse, verifyAuthToken } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';

type Body = {
  rotationId?: unknown;
  type?: unknown;
  reason?: unknown;
};

export async function POST(req: NextRequest) {
  let uid: string;

  try {
    const authResult = await verifyAuthToken(req);
    uid = authResult.uid;
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const rotationId = typeof body.rotationId === 'string' ? body.rotationId.trim() : '';
  const type = body.type === 'activate' || body.type === 'finish' ? body.type : null;
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

  if (!rotationId) {
    return NextResponse.json({ error: 'Rotation ID is required.' }, { status: 400 });
  }

  if (!type) {
    return NextResponse.json(
      { error: 'Petition type must be either "activate" or "finish".' },
      { status: 400 },
    );
  }

  try {
    const app = getAdminApp();
    const { getFirestore, FieldValue } = await import('firebase-admin/firestore');
    const db = getFirestore(app);

    const existingPending = await db
      .collection('rotationPetitions')
      .where('residentId', '==', uid)
      .where('rotationId', '==', rotationId)
      .where('status', '==', 'pending')
      .limit(1)
      .get();

    if (!existingPending.empty) {
      return NextResponse.json(
        {
          error:
            'You already have a pending petition for this rotation. Please wait for admin approval.',
        },
        { status: 400 },
      );
    }

    if (type === 'activate') {
      const activeAssignments = await db
        .collection('assignments')
        .where('residentId', '==', uid)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!activeAssignments.empty) {
        return NextResponse.json(
          {
            error:
              'You cannot have two rotations active at the same time. Please finish your current rotation first.',
          },
          { status: 400 },
        );
      }
    }

    const docRef = await db.collection('rotationPetitions').add({
      residentId: uid,
      rotationId,
      type,
      reason,
      status: 'pending',
      requestedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (error) {
    console.error('Failed to create rotation petition', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the petition.' },
      { status: 500 },
    );
  }
}
