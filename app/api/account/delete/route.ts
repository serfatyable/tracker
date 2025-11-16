export const runtime = 'nodejs';

import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { Firestore } from 'firebase-admin/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createAuthErrorResponse, verifyAuthToken } from '@/lib/api/auth';
import type { AuthResult } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { logger } from '@/lib/utils/logger';

const DELETE_BATCH_SIZE = 250;

async function deleteUserDocs(
  db: Firestore,
  collection: string,
  uid: string,
  field: string = 'userId',
): Promise<void> {
  // Delete documents in batches to avoid exceeding Firestore limits.
  while (true) {
    const snapshot = await db
      .collection(collection)
      .where(field, '==', uid)
      .limit(DELETE_BATCH_SIZE)
      .get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    if (snapshot.size < DELETE_BATCH_SIZE) {
      break;
    }
  }
}

export async function DELETE(req: NextRequest) {
  let authResult: AuthResult;
  try {
    authResult = await verifyAuthToken(req);
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  const app = getAdminApp();
  const db = getFirestore(app);
  const auth = getAdminAuth(app);

  try {
    const uid = authResult.uid;

    await deleteUserDocs(db, 'tasks', uid);
    await deleteUserDocs(db, 'cases', uid);
    await deleteUserDocs(db, 'cases', uid, 'residentId');

    await db
      .collection('users')
      .doc(uid)
      .delete()
      .catch((error) => {
        // Ignore missing documents so we can still remove the Auth user.
        if ((error as { code?: number }).code !== 5) {
          throw error;
        }
      });

    await auth.deleteUser(uid).catch((error) => {
      // Ignore if the user was already deleted via the client or another process.
      if ((error as { code?: string }).code !== 'auth/user-not-found') {
        throw error;
      }
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error(
      'Account deletion failed',
      'api/account/delete',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json(
      { error: 'Failed to delete account. Please try again later.' },
      { status: 500 },
    );
  }
}
