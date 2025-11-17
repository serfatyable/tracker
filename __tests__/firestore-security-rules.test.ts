/**
 * Firestore Security Rules Test Suite
 *
 * Tests comprehensive security validation including:
 * - Schema validation (required fields, types, formats)
 * - Field immutability rules
 * - Cross-collection validation
 * - Role-based access control
 *
 * Run with: pnpm test firestore-security-rules
 * Requires: Firebase emulator running (pnpm run emulators)
 */

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { setLogLevel } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  // Quiet Firestore logs during tests
  setLogLevel('error');

  // Initialize test environment
  testEnv = await initializeTestEnvironment({
    projectId: 'tracker-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv?.cleanup();
});

beforeEach(async () => {
  // Clear all data before each test
  await testEnv.clearFirestore();
});

// =========================
// HELPER FUNCTIONS
// =========================

/**
 * Create a user document in Firestore
 */
async function createUserDoc(
  uid: string,
  data: {
    role: 'resident' | 'tutor' | 'admin';
    status: 'pending' | 'active' | 'disabled';
    residencyStartDate?: string;
  },
) {
  const adminDb = testEnv.authenticatedContext('admin-user', { role: 'admin' }).firestore();
  await adminDb.doc(`users/${uid}`).set({
    role: data.role,
    status: data.status,
    settings: { language: 'en' },
    ...(data.residencyStartDate && { residencyStartDate: data.residencyStartDate }),
  });

  // Create the admin user doc if needed
  const adminUserDoc = await adminDb.doc('users/admin-user').get();
  if (!adminUserDoc.exists()) {
    await adminDb.doc('users/admin-user').set({
      role: 'admin',
      status: 'active',
      settings: { language: 'en' },
    });
  }
}

/**
 * Create a rotation document
 */
async function createRotation(rotationId: string, ownerTutorIds: string[] = []) {
  const adminDb = testEnv.authenticatedContext('admin-user', { role: 'admin' }).firestore();
  await adminDb.doc(`rotations/${rotationId}`).set({
    name: 'Test Rotation',
    createdAt: new Date(),
    ownerTutorIds,
    status: 'active',
  });
}

// =========================
// USER COLLECTION TESTS
// =========================

describe('Users Collection - Schema Validation', () => {
  it('should allow creating a valid resident user', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      db.doc('users/user1').set({
        role: 'resident',
        status: 'pending',
        settings: { language: 'en' },
        residencyStartDate: '2023-01-15',
      }),
    );
  });

  it('should reject user creation without required fields', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.doc('users/user1').set({
        role: 'resident',
        // Missing status and settings
      }),
    );
  });

  it('should reject resident without residencyStartDate', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.doc('users/user1').set({
        role: 'resident',
        status: 'pending',
        settings: { language: 'en' },
        // Missing residencyStartDate
      }),
    );
  });

  it('should reject invalid residencyStartDate format', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.doc('users/user1').set({
        role: 'resident',
        status: 'pending',
        settings: { language: 'en' },
        residencyStartDate: 'invalid-date', // Should be YYYY-MM-DD
      }),
    );
  });

  it('should reject invalid role value', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.doc('users/user1').set({
        role: 'superuser', // Invalid role
        status: 'pending',
        settings: { language: 'en' },
      }),
    );
  });

  it('should reject invalid language in settings', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.doc('users/user1').set({
        role: 'tutor',
        status: 'pending',
        settings: { language: 'fr' }, // Only 'en' and 'he' are valid
      }),
    );
  });
});

describe('Users Collection - Immutability Rules', () => {
  beforeEach(async () => {
    await createUserDoc('user1', {
      role: 'resident',
      status: 'pending',
      residencyStartDate: '2023-01-15',
    });
  });

  it('should prevent changing role after creation', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(
      db.doc('users/user1').update({
        role: 'tutor', // Cannot change role
        settings: { language: 'he' },
      }),
    );
  });

  it('should allow user to update their own settings', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertSucceeds(
      db.doc('users/user1').update({
        settings: { language: 'he' },
      }),
    );
  });

  it('should prevent user from deleting their own account', async () => {
    const db = testEnv.authenticatedContext('user1').firestore();
    await assertFails(db.doc('users/user1').delete());
  });

  it('should allow admin to delete user account', async () => {
    await createUserDoc('admin1', { role: 'admin', status: 'active' });
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertSucceeds(db.doc('users/user1').delete());
  });
});

// =========================
// TASK COLLECTION TESTS
// =========================

describe('Tasks Collection - Schema Validation', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createRotation('rotation1');
  });

  it('should allow creating a valid task', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertSucceeds(
      db.collection('tasks').add({
        userId: 'resident1',
        rotationId: 'rotation1',
        itemId: 'item1',
        status: 'pending',
        count: 1,
        requiredCount: 5,
      }),
    );
  });

  it('should reject task without required fields', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('tasks').add({
        userId: 'resident1',
        rotationId: 'rotation1',
        // Missing itemId and status
      }),
    );
  });

  it('should reject task with invalid status', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('tasks').add({
        userId: 'resident1',
        rotationId: 'rotation1',
        itemId: 'item1',
        status: 'completed', // Invalid status (only pending, approved, rejected)
      }),
    );
  });

  it('should reject task with count exceeding limit', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('tasks').add({
        userId: 'resident1',
        rotationId: 'rotation1',
        itemId: 'item1',
        status: 'pending',
        count: 15000, // Exceeds max of 10000
      }),
    );
  });

  it('should reject task creation for another user', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('tasks').add({
        userId: 'resident2', // Trying to create task for another user
        rotationId: 'rotation1',
        itemId: 'item1',
        status: 'pending',
      }),
    );
  });
});

describe('Tasks Collection - Cross-Collection Validation', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createRotation('rotation1');
  });

  it('should reject task with non-existent rotation', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('tasks').add({
        userId: 'resident1',
        rotationId: 'nonexistent-rotation', // Rotation doesn't exist
        itemId: 'item1',
        status: 'pending',
      }),
    );
  });

  it('should reject task with non-existent user', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('tasks').add({
        userId: 'nonexistent-user', // User doesn't exist
        rotationId: 'rotation1',
        itemId: 'item1',
        status: 'pending',
      }),
    );
  });
});

describe('Tasks Collection - Immutability Rules', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createRotation('rotation1');

    const db = testEnv.authenticatedContext('resident1').firestore();
    await db.doc('tasks/task1').set({
      userId: 'resident1',
      rotationId: 'rotation1',
      itemId: 'item1',
      status: 'pending',
      count: 1,
      createdAt: new Date(),
    });
  });

  it('should prevent changing userId after creation', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.doc('tasks/task1').update({
        userId: 'resident2', // Cannot change userId
      }),
    );
  });

  it('should prevent changing rotationId after creation', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.doc('tasks/task1').update({
        rotationId: 'rotation2', // Cannot change rotationId
      }),
    );
  });

  it('should prevent changing itemId after creation', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.doc('tasks/task1').update({
        itemId: 'item2', // Cannot change itemId
      }),
    );
  });

  it('should allow updating status', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertSucceeds(
      db.doc('tasks/task1').update({
        status: 'approved',
      }),
    );
  });
});

// =========================
// ROTATION COLLECTION TESTS
// =========================

describe('Rotations Collection - Schema Validation', () => {
  beforeEach(async () => {
    await createUserDoc('admin1', { role: 'admin', status: 'active' });
  });

  it('should allow admin to create valid rotation', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertSucceeds(
      db.collection('rotations').add({
        name: 'ICU Rotation',
        createdAt: new Date(),
        status: 'active',
        ownerTutorIds: [],
      }),
    );
  });

  it('should reject rotation without required fields', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.collection('rotations').add({
        name: 'ICU Rotation',
        // Missing createdAt
      }),
    );
  });

  it('should reject rotation with name too long', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.collection('rotations').add({
        name: 'A'.repeat(300), // Exceeds max length of 200
        createdAt: new Date(),
      }),
    );
  });

  it('should reject rotation with invalid status', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.collection('rotations').add({
        name: 'ICU Rotation',
        createdAt: new Date(),
        status: 'archived', // Invalid status
      }),
    );
  });

  it('should prevent non-admin from creating rotation', async () => {
    await createUserDoc('tutor1', { role: 'tutor', status: 'active' });
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertFails(
      db.collection('rotations').add({
        name: 'ICU Rotation',
        createdAt: new Date(),
      }),
    );
  });
});

// =========================
// ROTATION PETITION TESTS
// =========================

describe('Rotation Petitions - Schema Validation', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createRotation('rotation1');
  });

  it('should allow resident to create valid petition', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertSucceeds(
      db.collection('rotationPetitions').add({
        residentId: 'resident1',
        rotationId: 'rotation1',
        type: 'activate',
        status: 'pending',
        requestedAt: new Date(),
      }),
    );
  });

  it('should reject petition with invalid type', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('rotationPetitions').add({
        residentId: 'resident1',
        rotationId: 'rotation1',
        type: 'pause', // Invalid type
        status: 'pending',
        requestedAt: new Date(),
      }),
    );
  });

  it('should reject petition for non-existent rotation', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('rotationPetitions').add({
        residentId: 'resident1',
        rotationId: 'nonexistent', // Rotation doesn't exist
        type: 'activate',
        status: 'pending',
        requestedAt: new Date(),
      }),
    );
  });

  it('should reject petition created for another user', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('rotationPetitions').add({
        residentId: 'resident2', // Creating for another user
        rotationId: 'rotation1',
        type: 'activate',
        status: 'pending',
        requestedAt: new Date(),
      }),
    );
  });
});

describe('Rotation Petitions - Immutability Rules', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createUserDoc('tutor1', { role: 'tutor', status: 'active' });
    await createRotation('rotation1', ['tutor1']);

    const db = testEnv.authenticatedContext('resident1').firestore();
    await db.doc('rotationPetitions/petition1').set({
      residentId: 'resident1',
      rotationId: 'rotation1',
      type: 'activate',
      status: 'pending',
      requestedAt: new Date(),
    });
  });

  it('should prevent changing residentId after creation', async () => {
    await createUserDoc('admin1', { role: 'admin', status: 'active' });
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.doc('rotationPetitions/petition1').update({
        residentId: 'resident2', // Cannot change residentId
        status: 'approved',
      }),
    );
  });

  it('should prevent changing rotationId after creation', async () => {
    await createUserDoc('admin1', { role: 'admin', status: 'active' });
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.doc('rotationPetitions/petition1').update({
        rotationId: 'rotation2', // Cannot change rotationId
        status: 'approved',
      }),
    );
  });

  it('should allow tutor to approve petition for their rotation', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertSucceeds(
      db.doc('rotationPetitions/petition1').update({
        status: 'approved',
      }),
    );
  });
});

// =========================
// ASSIGNMENT COLLECTION TESTS
// =========================

describe('Assignments - Schema Validation', () => {
  beforeEach(async () => {
    await createUserDoc('admin1', { role: 'admin', status: 'active' });
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createRotation('rotation1');
  });

  it('should allow admin to create valid assignment', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertSucceeds(
      db.collection('assignments').add({
        residentId: 'resident1',
        rotationId: 'rotation1',
        tutorIds: ['tutor1'],
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      }),
    );
  });

  it('should reject assignment without required fields', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.collection('assignments').add({
        residentId: 'resident1',
        rotationId: 'rotation1',
        // Missing tutorIds and status
      }),
    );
  });

  it('should reject assignment with invalid status', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.collection('assignments').add({
        residentId: 'resident1',
        rotationId: 'rotation1',
        tutorIds: [],
        status: 'completed', // Invalid status
        startedAt: new Date(),
        endedAt: null,
      }),
    );
  });

  it('should reject assignment for non-existent rotation', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.collection('assignments').add({
        residentId: 'resident1',
        rotationId: 'nonexistent', // Rotation doesn't exist
        tutorIds: [],
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      }),
    );
  });

  it('should prevent non-admin from creating assignment', async () => {
    await createUserDoc('tutor1', { role: 'tutor', status: 'active' });
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertFails(
      db.collection('assignments').add({
        residentId: 'resident1',
        rotationId: 'rotation1',
        tutorIds: ['tutor1'],
        status: 'active',
        startedAt: new Date(),
        endedAt: null,
      }),
    );
  });
});

// =========================
// REFLECTION COLLECTION TESTS
// =========================

describe('Reflections - Schema Validation', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
  });

  it('should allow creating valid reflection', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertSucceeds(
      db.collection('reflections').add({
        taskOccurrenceId: 'task1',
        taskType: 'skill',
        templateKey: 'default_resident',
        templateVersion: 1,
        authorId: 'resident1',
        authorRole: 'resident',
        residentId: 'resident1',
        answers: { prompt1: 'Answer 1' },
        submittedAt: new Date(),
      }),
    );
  });

  it('should reject reflection without required fields', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('reflections').add({
        taskOccurrenceId: 'task1',
        taskType: 'skill',
        // Missing templateKey, templateVersion, etc.
      }),
    );
  });

  it('should reject reflection with invalid authorRole', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('reflections').add({
        taskOccurrenceId: 'task1',
        taskType: 'skill',
        templateKey: 'default_resident',
        templateVersion: 1,
        authorId: 'resident1',
        authorRole: 'admin', // Invalid authorRole (only resident, tutor)
        residentId: 'resident1',
        answers: {},
      }),
    );
  });

  it('should reject reflection for non-existent resident', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('reflections').add({
        taskOccurrenceId: 'task1',
        taskType: 'skill',
        templateKey: 'default_resident',
        templateVersion: 1,
        authorId: 'resident1',
        authorRole: 'resident',
        residentId: 'nonexistent', // Resident doesn't exist
        answers: {},
      }),
    );
  });

  it('should prevent creating reflection as another user', async () => {
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('reflections').add({
        taskOccurrenceId: 'task1',
        taskType: 'skill',
        templateKey: 'default_resident',
        templateVersion: 1,
        authorId: 'resident2', // Creating as another user
        authorRole: 'resident',
        residentId: 'resident1',
        answers: {},
      }),
    );
  });
});

describe('Reflections - Immutability Rules', () => {
  beforeEach(async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    await createUserDoc('admin1', { role: 'admin', status: 'active' });

    const db = testEnv.authenticatedContext('resident1').firestore();
    await db.doc('reflections/reflection1').set({
      taskOccurrenceId: 'task1',
      taskType: 'skill',
      templateKey: 'default_resident',
      templateVersion: 1,
      authorId: 'resident1',
      authorRole: 'resident',
      residentId: 'resident1',
      answers: { prompt1: 'Answer 1' },
      submittedAt: new Date(),
    });
  });

  it('should prevent changing answers after submission', async () => {
    await createUserDoc('admin1', { role: 'admin', status: 'active' });
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(
      db.doc('reflections/reflection1').update({
        answers: { prompt1: 'Modified Answer' }, // Cannot change answers after submission
      }),
    );
  });

  it('should allow admin to add adminComment', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertSucceeds(
      db.doc('reflections/reflection1').update({
        adminComment: {
          text: 'Great reflection!',
          adminId: 'admin1',
          createdAt: new Date(),
        },
      }),
    );
  });

  it('should prevent deletion of reflections', async () => {
    const db = testEnv.authenticatedContext('admin1').firestore();
    await assertFails(db.doc('reflections/reflection1').delete());
  });
});

// =========================
// EXAM COLLECTION TESTS
// =========================

describe('Exams - Schema Validation', () => {
  beforeEach(async () => {
    await createUserDoc('tutor1', { role: 'tutor', status: 'active' });
  });

  it('should allow tutor to create valid exam', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertSucceeds(
      db.collection('exams').add({
        examDate: new Date(),
        subjects: [],
        createdAt: new Date(),
        createdBy: 'tutor1',
        updatedAt: new Date(),
        updatedBy: 'tutor1',
        isActive: true,
        pastExams: [],
        studyMaterials: [],
      }),
    );
  });

  it('should reject exam without required fields', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertFails(
      db.collection('exams').add({
        examDate: new Date(),
        // Missing subjects, createdAt, etc.
      }),
    );
  });

  it('should reject exam with too many subjects', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertFails(
      db.collection('exams').add({
        examDate: new Date(),
        subjects: new Array(15).fill({ titleEn: 'Subject', titleHe: 'נושא' }), // Exceeds max of 10
        createdAt: new Date(),
        createdBy: 'tutor1',
        updatedAt: new Date(),
        updatedBy: 'tutor1',
        isActive: true,
        pastExams: [],
        studyMaterials: [],
      }),
    );
  });

  it('should prevent non-tutor/admin from creating exam', async () => {
    await createUserDoc('resident1', {
      role: 'resident',
      status: 'active',
      residencyStartDate: '2023-01-15',
    });
    const db = testEnv.authenticatedContext('resident1').firestore();
    await assertFails(
      db.collection('exams').add({
        examDate: new Date(),
        subjects: [],
        createdAt: new Date(),
        createdBy: 'resident1',
        updatedAt: new Date(),
        updatedBy: 'resident1',
        isActive: true,
        pastExams: [],
        studyMaterials: [],
      }),
    );
  });
});

describe('Exams - Immutability Rules', () => {
  beforeEach(async () => {
    await createUserDoc('tutor1', { role: 'tutor', status: 'active' });

    const db = testEnv.authenticatedContext('tutor1').firestore();
    await db.doc('exams/exam1').set({
      examDate: new Date(),
      subjects: [],
      createdAt: new Date('2023-01-01'),
      createdBy: 'tutor1',
      updatedAt: new Date(),
      updatedBy: 'tutor1',
      isActive: true,
      pastExams: [],
      studyMaterials: [],
    });
  });

  it('should prevent changing createdAt after creation', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertFails(
      db.doc('exams/exam1').update({
        createdAt: new Date(), // Cannot change createdAt
      }),
    );
  });

  it('should prevent changing createdBy after creation', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertFails(
      db.doc('exams/exam1').update({
        createdBy: 'tutor2', // Cannot change createdBy
      }),
    );
  });

  it('should allow updating exam details', async () => {
    const db = testEnv.authenticatedContext('tutor1').firestore();
    await assertSucceeds(
      db.doc('exams/exam1').update({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: 'tutor1',
      }),
    );
  });
});
