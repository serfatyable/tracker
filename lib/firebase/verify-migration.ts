/**
 * Migration Verification Utilities
 *
 * Use these functions to verify that the tutorIds migration worked correctly
 */

import { getFirestore, collection, query, where, limit, getDocs } from 'firebase/firestore';

import { getCurrentUserWithProfile } from './auth';
import { getFirebaseApp } from './client';

export type VerificationResult = {
  success: boolean;
  message: string;
  details?: any;
};

/**
 * Check if tasks have tutorIds field
 */
export async function verifyTasksHaveTutorIds(
  sampleSize: number = 10,
): Promise<VerificationResult> {
  const db = getFirestore(getFirebaseApp());

  try {
    const tasksQuery = query(collection(db, 'tasks'), limit(sampleSize));
    const snapshot = await getDocs(tasksQuery);

    if (snapshot.empty) {
      return {
        success: false,
        message: 'No tasks found in database',
      };
    }

    let tasksWithTutorIds = 0;
    const samples: any[] = [];

    snapshot.docs.forEach((taskDoc) => {
      const data = taskDoc.data();
      const hasTutorIds = data.tutorIds !== undefined;

      if (hasTutorIds) tasksWithTutorIds++;

      samples.push({
        id: taskDoc.id,
        userId: data.userId,
        hasTutorIds,
        tutorIds: data.tutorIds,
      });
    });

    const success = tasksWithTutorIds === snapshot.size;

    return {
      success,
      message: success
        ? `✅ All ${snapshot.size} sampled tasks have tutorIds`
        : `⚠️ Only ${tasksWithTutorIds}/${snapshot.size} tasks have tutorIds`,
      details: {
        total: snapshot.size,
        withTutorIds: tasksWithTutorIds,
        samples,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error checking tasks: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Check active assignments
 */
export async function verifyActiveAssignments(): Promise<VerificationResult> {
  const db = getFirestore(getFirebaseApp());

  try {
    const assignmentsQuery = query(collection(db, 'assignments'), where('endedAt', '==', null));
    const snapshot = await getDocs(assignmentsQuery);

    const assignments = snapshot.docs.map((doc) => ({
      id: doc.id,
      residentId: doc.data().residentId,
      tutorIds: doc.data().tutorIds || [],
      rotationId: doc.data().rotationId,
    }));

    return {
      success: true,
      message: `Found ${snapshot.size} active assignments`,
      details: {
        count: snapshot.size,
        assignments,
      },
    };
  } catch (error) {
    return {
      success: false,
      message: `Error checking assignments: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Verify current user's authorization works correctly
 */
export async function verifyUserAuthorization(): Promise<VerificationResult> {
  const db = getFirestore(getFirebaseApp());

  try {
    const { profile } = await getCurrentUserWithProfile();

    if (!profile) {
      return {
        success: false,
        message: 'Not signed in',
      };
    }

    // Get all tasks this user can see
    const tasksSnapshot = await getDocs(collection(db, 'tasks'));

    if (profile.role === 'admin') {
      return {
        success: true,
        message: `✅ Admin can see ${tasksSnapshot.size} tasks (expected: all)`,
        details: {
          role: 'admin',
          tasksVisible: tasksSnapshot.size,
        },
      };
    }

    if (profile.role === 'tutor') {
      // Get assigned residents
      const myAssignments = await getDocs(
        query(
          collection(db, 'assignments'),
          where('tutorIds', 'array-contains', profile.uid),
          where('endedAt', '==', null),
        ),
      );

      const assignedResidentIds = new Set(myAssignments.docs.map((doc) => doc.data().residentId));

      // Check which residents' tasks are visible
      const visibleResidentIds = new Set<string>();
      tasksSnapshot.docs.forEach((doc) => {
        visibleResidentIds.add(doc.data().userId);
      });

      // Verify they match
      const visibleArray = Array.from(visibleResidentIds).sort();
      const assignedArray = Array.from(assignedResidentIds).sort();
      const match = JSON.stringify(visibleArray) === JSON.stringify(assignedArray);

      return {
        success: match,
        message: match
          ? `✅ Tutor sees only assigned residents' tasks`
          : `⚠️ Tutor sees tasks from unassigned residents`,
        details: {
          role: 'tutor',
          assignedResidents: assignedArray,
          visibleResidents: visibleArray,
          tasksVisible: tasksSnapshot.size,
          assignmentsCount: myAssignments.size,
          match,
        },
      };
    }

    if (profile.role === 'resident') {
      // Resident should only see their own tasks
      const ownTasks = tasksSnapshot.docs.filter((doc) => doc.data().userId === profile.uid);
      const success = ownTasks.length === tasksSnapshot.size;

      return {
        success,
        message: success
          ? `✅ Resident sees only own tasks`
          : `⚠️ Resident sees tasks from other users`,
        details: {
          role: 'resident',
          ownTasks: ownTasks.length,
          totalVisible: tasksSnapshot.size,
        },
      };
    }

    // TypeScript knows this is unreachable, but we handle it defensively
    return {
      success: false,
      message: `Unknown role: ${(profile as any).role}`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Error verifying authorization: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Run all verification checks
 */
export async function verifyAllMigrationChecks(): Promise<{
  success: boolean;
  checks: {
    tasksHaveTutorIds: VerificationResult;
    activeAssignments: VerificationResult;
    userAuthorization: VerificationResult;
  };
}> {
  console.log('🔍 Running migration verification...\n');

  const tasksCheck = await verifyTasksHaveTutorIds();
  console.log('1️⃣ Tasks have tutorIds:', tasksCheck.message);

  const assignmentsCheck = await verifyActiveAssignments();
  console.log('2️⃣ Active assignments:', assignmentsCheck.message);

  const authCheck = await verifyUserAuthorization();
  console.log('3️⃣ User authorization:', authCheck.message);

  const allSuccess = tasksCheck.success && assignmentsCheck.success && authCheck.success;

  console.log('\n' + (allSuccess ? '✅ All checks passed!' : '⚠️ Some checks failed'));

  return {
    success: allSuccess,
    checks: {
      tasksHaveTutorIds: tasksCheck,
      activeAssignments: assignmentsCheck,
      userAuthorization: authCheck,
    },
  };
}

/**
 * Quick verification - run this after migration
 */
export async function quickVerify(): Promise<boolean> {
  const result = await verifyAllMigrationChecks();

  if (result.success) {
    console.log('\n🎉 Migration successful! Issue #1 is fixed.');
    return true;
  } else {
    console.log('\n⚠️ Migration needs attention. Check details above.');
    console.log('See VERIFY_MIGRATION.md for troubleshooting.');
    return false;
  }
}
