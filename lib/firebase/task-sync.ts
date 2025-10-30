/**
 * Task-Assignment Synchronization
 *
 * PURPOSE: Keep task documents in sync with assignment data for authorization
 *
 * PROBLEM: Firestore security rules cannot query the assignments collection
 * to check if a tutor is assigned to a resident. Rules can only access the
 * current document being read/written.
 *
 * SOLUTION: Denormalize assignment data (tutorIds) onto task documents.
 * When assignments change, update all related tasks.
 *
 * This allows rules to check: task.tutorIds.includes(request.auth.uid)
 */

import type { Unsubscribe } from 'firebase/firestore';
import {
  getFirestore,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';

import { getFirebaseApp } from './client';

/**
 * Sync tutorIds from an assignment to all tasks for that resident
 *
 * Call this whenever:
 * - An assignment is created
 * - An assignment's tutorIds changes
 * - An assignment ends (to remove tutorIds from tasks)
 */
export async function syncTutorIdsToTasks(
  residentId: string,
  tutorIds: string[],
): Promise<{ updated: number }> {
  const db = getFirestore(getFirebaseApp());

  // Find all tasks for this resident
  const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', residentId));
  const tasksSnap = await getDocs(tasksQuery);

  if (tasksSnap.empty) {
    return { updated: 0 };
  }

  // Update tasks in batches (Firestore limit: 500 per batch)
  const batch = writeBatch(db);
  let count = 0;

  for (const taskDoc of tasksSnap.docs) {
    batch.update(taskDoc.ref, {
      tutorIds: tutorIds, // Overwrite with current assignment tutorIds
    });
    count++;

    // Commit batch if we hit the limit
    if (count % 500 === 0) {
      await batch.commit();
    }
  }

  // Commit remaining updates
  if (count % 500 !== 0) {
    await batch.commit();
  }

  return { updated: count };
}

/**
 * Remove tutorIds from all tasks for a resident
 * Call this when an assignment ends
 */
export async function clearTutorIdsFromTasks(residentId: string): Promise<{ updated: number }> {
  const db = getFirestore(getFirebaseApp());

  const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', residentId));
  const tasksSnap = await getDocs(tasksQuery);

  if (tasksSnap.empty) {
    return { updated: 0 };
  }

  const batch = writeBatch(db);
  let count = 0;

  for (const taskDoc of tasksSnap.docs) {
    // Remove tutorIds field entirely
    batch.update(taskDoc.ref, {
      tutorIds: [],
    });
    count++;

    if (count % 500 === 0) {
      await batch.commit();
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }

  return { updated: count };
}

/**
 * Watch for assignment changes and sync to tasks automatically
 *
 * USAGE: Call this once when the app initializes (e.g., in a useEffect hook)
 * Returns an unsubscribe function to stop listening
 *
 * @example
 * useEffect(() => {
 *   const unsubscribe = watchAssignmentsAndSyncTasks();
 *   return unsubscribe;
 * }, []);
 */
export function watchAssignmentsAndSyncTasks(): Unsubscribe {
  const db = getFirestore(getFirebaseApp());
  const assignmentsQuery = query(collection(db, 'assignments'));

  return onSnapshot(assignmentsQuery, async (snapshot) => {
    // Process each changed assignment
    for (const change of snapshot.docChanges()) {
      const assignment = change.doc.data() as any;

      if (change.type === 'added' || change.type === 'modified') {
        // Assignment was created or updated
        if (assignment.endedAt === null) {
          // Active assignment - sync tutorIds to tasks
          await syncTutorIdsToTasks(assignment.residentId, assignment.tutorIds || []);
        } else {
          // Assignment ended - clear tutorIds from tasks
          await clearTutorIdsFromTasks(assignment.residentId);
        }
      }
    }
  });
}

/**
 * One-time migration: Add tutorIds to all existing tasks
 *
 * Run this once after deploying the new rules to backfill existing data
 *
 * @returns Stats about the migration
 */
export async function migrateExistingTasks(): Promise<{
  processed: number;
  updated: number;
  errors: string[];
}> {
  const db = getFirestore(getFirebaseApp());
  const errors: string[] = [];
  let processed = 0;
  let updated = 0;

  try {
    // Get all active assignments
    const assignmentsSnap = await getDocs(
      query(collection(db, 'assignments'), where('endedAt', '==', null)),
    );

    for (const assignmentDoc of assignmentsSnap.docs) {
      const assignment = assignmentDoc.data() as any;

      try {
        const result = await syncTutorIdsToTasks(assignment.residentId, assignment.tutorIds || []);
        updated += result.updated;
        processed++;
      } catch (error) {
        errors.push(
          `Failed to sync assignment ${assignmentDoc.id}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }

    return { processed, updated, errors };
  } catch (error) {
    errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return { processed, updated, errors };
  }
}
