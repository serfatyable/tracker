import { NextResponse, type NextRequest } from 'next/server';

import { createAuthErrorResponse, verifyAuthToken } from '@/lib/api/auth';
import {
  listRotationPetitionsWithDetails,
  approveRotationPetition,
  denyRotationPetition,
} from '@/lib/firebase/admin';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import {
  validateApiRequest,
  createRotationPetitionRequestSchema,
  updateRotationPetitionRequestSchema,
  listRotationPetitionsQuerySchema,
} from '@/lib/schemas';
import { logger } from '@/lib/utils/logger';

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

    // Get and validate query parameters
    const { searchParams } = new URL(req.url);
    const queryData = {
      status: searchParams.get('status') || undefined,
      residentId: searchParams.get('residentId') || undefined,
      limit: searchParams.get('limit') || undefined,
    };

    const validationResult = validateApiRequest(listRotationPetitionsQuerySchema, queryData);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status },
      );
    }

    const params: any = {};
    if (validationResult.data.status) params.status = validationResult.data.status;
    if (validationResult.data.residentId) params.residentQuery = validationResult.data.residentId;
    if (validationResult.data.limit) params.limit = validationResult.data.limit;

    const result = await listRotationPetitionsWithDetails(params);

    return NextResponse.json({ petitions: result.items }, { status: 200 });
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

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  // Validate request body with Zod
  const validationResult = validateApiRequest(createRotationPetitionRequestSchema, body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: validationResult.error },
      { status: validationResult.status },
    );
  }

  const { rotationId, type, reason } = validationResult.data;

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

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
    }

    // Validate request body with Zod
    const validationResult = validateApiRequest(updateRotationPetitionRequestSchema, body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: validationResult.status },
      );
    }

    const { petitionId, action } = validationResult.data;

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
