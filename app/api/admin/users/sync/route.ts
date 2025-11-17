export const runtime = 'nodejs';

import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdminAuth, createAuthErrorResponse } from '@/lib/api/auth';
import { getAdminApp } from '@/lib/firebase/admin-sdk';
import { logger } from '@/lib/utils/logger';

export type OrphanedAuthAccount = {
  uid: string;
  email: string | undefined;
  createdAt: string;
  lastSignInTime: string | undefined;
};

export type OrphanedFirestoreDoc = {
  uid: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: string;
};

export type SyncResponse = {
  orphanedAuth: OrphanedAuthAccount[];
  orphanedFirestore: OrphanedFirestoreDoc[];
  inSync: number;
};

/**
 * GET /api/admin/users/sync
 * Lists all orphaned accounts (Auth accounts without Firestore docs, and vice versa)
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdminAuth(req);
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  const app = getAdminApp();
  const auth = getAdminAuth(app);
  const db = getFirestore(app);

  try {
    // List all Firebase Auth users
    const authUsers = new Map<string, OrphanedAuthAccount>();
    let pageToken: string | undefined;

    do {
      const listResult = await auth.listUsers(1000, pageToken);
      listResult.users.forEach((userRecord) => {
        authUsers.set(userRecord.uid, {
          uid: userRecord.uid,
          email: userRecord.email,
          createdAt: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime,
        });
      });
      pageToken = listResult.pageToken;
    } while (pageToken);

    // List all Firestore user documents
    const firestoreUsersSnap = await db.collection('users').get();
    const firestoreUsers = new Map<string, OrphanedFirestoreDoc>();

    firestoreUsersSnap.docs.forEach((doc) => {
      const data = doc.data();
      firestoreUsers.set(doc.id, {
        uid: doc.id,
        email: data.email || '',
        fullName: data.fullName || '',
        role: data.role || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || '',
      });
    });

    // Find orphans
    const orphanedAuth: OrphanedAuthAccount[] = [];
    const orphanedFirestore: OrphanedFirestoreDoc[] = [];
    let inSync = 0;

    // Check for Auth accounts without Firestore docs
    authUsers.forEach((authUser, uid) => {
      if (!firestoreUsers.has(uid)) {
        orphanedAuth.push(authUser);
      } else {
        inSync++;
      }
    });

    // Check for Firestore docs without Auth accounts
    firestoreUsers.forEach((firestoreUser, uid) => {
      if (!authUsers.has(uid)) {
        orphanedFirestore.push(firestoreUser);
      }
    });

    return NextResponse.json({
      orphanedAuth,
      orphanedFirestore,
      inSync,
    } as SyncResponse);
  } catch (error) {
    logger.error(
      'Account sync listing failed',
      'api/admin/users/sync',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: 'Failed to list account sync data' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/sync
 * Deletes orphaned accounts based on type
 * Body: { type: 'auth' | 'firestore', uids: string[] }
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAdminAuth(req);
  } catch (error) {
    return createAuthErrorResponse(error);
  }

  const app = getAdminApp();
  const auth = getAdminAuth(app);
  const db = getFirestore(app);

  try {
    const body = await req.json();
    const { type, uids } = body;

    if (!type || !Array.isArray(uids) || uids.length === 0) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (type !== 'auth' && type !== 'firestore') {
      return NextResponse.json({ error: 'Invalid type. Must be "auth" or "firestore"' }, { status: 400 });
    }

    const deleted: string[] = [];
    const errors: Array<{ uid: string; error: string }> = [];

    if (type === 'auth') {
      // Delete orphaned Firebase Auth accounts
      for (const uid of uids) {
        try {
          await auth.deleteUser(uid);
          deleted.push(uid);
          logger.info(`Deleted orphaned Auth account: ${uid}`, 'api/admin/users/sync');
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ uid, error: errorMsg });
          logger.error(
            `Failed to delete Auth account ${uid}: ${errorMsg}`,
            'api/admin/users/sync',
            error instanceof Error ? error : new Error(errorMsg),
          );
        }
      }
    } else {
      // Delete orphaned Firestore user documents
      const batch = db.batch();
      for (const uid of uids) {
        try {
          batch.delete(db.collection('users').doc(uid));
          deleted.push(uid);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          errors.push({ uid, error: errorMsg });
        }
      }

      if (deleted.length > 0) {
        await batch.commit();
        logger.info(`Deleted ${deleted.length} orphaned Firestore documents`, 'api/admin/users/sync');
      }
    }

    return NextResponse.json({
      deleted,
      errors,
      success: errors.length === 0,
    });
  } catch (error) {
    logger.error(
      'Account sync deletion failed',
      'api/admin/users/sync',
      error instanceof Error ? error : new Error(String(error)),
    );
    return NextResponse.json({ error: 'Failed to delete orphaned accounts' }, { status: 500 });
  }
}
