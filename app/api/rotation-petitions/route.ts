import { NextResponse, type NextRequest } from 'next/server';

import { createAuthErrorResponse, verifyAuthToken } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { listRotationPetitions, approveRotationPetition, denyRotationPetition } from '@/lib/firebase/admin';
import { logger } from '@/lib/utils/logger';

type PostBody = {
  rotationId?: unknown;
  type?: unknown;
  reason?: unknown;
};

type PatchBody = {
  petitionId?: unknown;
  action?: unknown;
};

export async function GET(req: NextRequest) {
  let uid: string;

  try {
    const authResult = await verifyAuthToken(req);
    uid = authResult.uid;
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  // Check if user is admin
  try {
    const app = getAdminApp();
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore(app);
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as 'pending' | 'approved' | 'denied' | null;
    const residentId = searchParams.get('residentId');
    const limit = searchParams.get('limit');

    const params: any = {};
    if (status) params.status = status;
    if (residentId) params.residentId = residentId;
    if (limit) params.limit = parseInt(limit, 10);

    const petitions = await listRotationPetitions(params);

    return NextResponse.json({ petitions }, { status: 200 });
  } catch (error) {
    logger.error(
      'Failed to list rotation petitions',
      'api/rotation-petitions',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred while fetching petitions.' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  let uid: string;

  try {
    const authResult = await verifyAuthToken(req);
    uid = authResult.uid;
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
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
    logger.error(
      'Failed to create rotation petition',
      'api/rotation-petitions',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred while creating the petition.' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  let uid: string;

  try {
    const authResult = await verifyAuthToken(req);
    uid = authResult.uid;
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  // Check if user is admin
  try {
    const app = getAdminApp();
    const { getFirestore } = await import('firebase-admin/firestore');
    const db = getFirestore(app);
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    let body: PatchBody;
    try {
      body = (await req.json()) as PatchBody;
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    const petitionId = typeof body.petitionId === 'string' ? body.petitionId.trim() : '';
    const action = body.action === 'approve' || body.action === 'deny' ? body.action : null;

    if (!petitionId) {
      return NextResponse.json({ error: 'Petition ID is required.' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Action must be either "approve" or "deny".' },
        { status: 400 },
      );
    }

    if (action === 'approve') {
      await approveRotationPetition(petitionId, uid);
    } else {
      await denyRotationPetition(petitionId, uid);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error(
      'Failed to update rotation petition',
      'api/rotation-petitions',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred.' },
      { status: 500 },
    );
  }
}
