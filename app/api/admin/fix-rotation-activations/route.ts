import { NextResponse, type NextRequest } from 'next/server';

import { createAuthErrorResponse, verifyAuthToken } from '@/lib/api/auth';
import { fixOrphanedRotationApprovals, fixResidentRotationActivation } from '@/lib/firebase/admin';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/admin/fix-rotation-activations
 *
 * Fixes residents with approved rotation selections but missing active assignments.
 *
 * Body (optional):
 * - residentId: string (optional) - Fix a specific resident. If omitted, fixes all affected residents.
 */
export async function POST(req: NextRequest) {
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

    // Get request body
    let residentId: string | undefined;
    try {
      const body = await req.json();
      residentId = typeof body.residentId === 'string' ? body.residentId.trim() : undefined;
    } catch {
      // No body is fine - we'll fix all users
    }

    if (residentId) {
      // Fix a specific resident
      const result = await fixResidentRotationActivation(residentId);

      if (result.fixed) {
        logger.info(
          `Fixed rotation activation for resident ${residentId}`,
          'api/admin/fix-rotation-activations',
        );
      }

      return NextResponse.json(result, { status: 200 });
    } else {
      // Fix all affected residents
      const result = await fixOrphanedRotationApprovals();

      logger.info(
        `Fixed rotation activations: ${result.usersFixed}/${result.usersScanned} users`,
        'api/admin/fix-rotation-activations',
      );

      return NextResponse.json(result, { status: 200 });
    }
  } catch (error) {
    logger.error(
      'Failed to fix rotation activations',
      'api/admin/fix-rotation-activations',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'An unexpected error occurred while fixing rotation activations.' },
      { status: 500 },
    );
  }
}
