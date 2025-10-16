# Verify Migration Success

Run these checks in your browser console to confirm the migration worked:

## Check 1: Migration Results

What did you see when you ran `migrateExistingTasks()`?

**Expected output:**

```javascript
{
  processed: 5,      // Number of assignments processed
  updated: 47,       // Number of tasks updated
  errors: []         // Should be empty
}
```

**If you saw this:** ✅ Migration likely succeeded!

**If errors array has items:** ⚠️ Some tasks failed - check the error messages

---

## Check 2: Verify Tasks Have tutorIds

Run this in browser console:

```javascript
// Get a few tasks and check if they have tutorIds
import { getFirestore, collection, query, limit, getDocs } from 'firebase/firestore';
import { getFirebaseApp } from './lib/firebase/client';

const db = getFirestore(getFirebaseApp());
const tasksQuery = query(collection(db, 'tasks'), limit(5));
const snapshot = await getDocs(tasksQuery);

snapshot.docs.forEach((doc) => {
  const data = doc.data();
  console.log(`Task ${doc.id}:`, {
    userId: data.userId,
    tutorIds: data.tutorIds,
    hasTutorIds: data.tutorIds !== undefined,
  });
});
```

**Expected result:**

```javascript
Task abc123: { userId: "resident1", tutorIds: ["tutor1", "tutor2"], hasTutorIds: true }
Task def456: { userId: "resident2", tutorIds: ["tutor3"], hasTutorIds: true }
Task ghi789: { userId: "resident3", tutorIds: [], hasTutorIds: true }
```

**What to look for:**

- ✅ All tasks should have `hasTutorIds: true`
- ✅ Tasks should have `tutorIds` array (can be empty if no active assignment)
- ❌ If `hasTutorIds: false` - migration didn't complete

---

## Check 3: Verify Assignment Data

Check that active assignments exist:

```javascript
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { getFirebaseApp } from './lib/firebase/client';

const db = getFirestore(getFirebaseApp());
const assignmentsQuery = query(collection(db, 'assignments'), where('endedAt', '==', null));
const snapshot = await getDocs(assignmentsQuery);

console.log(`Active assignments: ${snapshot.size}`);
snapshot.docs.forEach((doc) => {
  const data = doc.data();
  console.log(`Assignment ${doc.id}:`, {
    residentId: data.residentId,
    tutorIds: data.tutorIds,
    rotationId: data.rotationId,
  });
});
```

**Expected:**

- Should show all active assignments
- Each should have `tutorIds` array with tutor UIDs

---

## Check 4: Test Authorization (Most Important!)

This is the real test - can tutors only see their assigned residents' tasks?

### Test A: Admin Can See All Tasks

```javascript
// Sign in as admin first, then:
const db = getFirestore(getFirebaseApp());
const allTasks = await getDocs(collection(db, 'tasks'));
console.log(`Admin sees ${allTasks.size} tasks`);
// Should see ALL tasks ✅
```

### Test B: Tutor Sees Only Assigned Tasks

```javascript
// Sign in as a tutor, then:
const db = getFirestore(getFirebaseApp());

// Try to get all tasks
const allTasks = await getDocs(collection(db, 'tasks'));
console.log(`Tutor sees ${allTasks.size} tasks`);

// Check which residents these tasks belong to
const residents = new Set();
allTasks.docs.forEach((doc) => {
  residents.add(doc.data().userId);
});
console.log(`Tasks from these residents:`, Array.from(residents));

// Now check your assignments
const { getCurrentUserWithProfile } = await import('./lib/firebase/auth');
const { profile } = await getCurrentUserWithProfile();
const myUid = profile.uid;

const assignmentsQuery = query(
  collection(db, 'assignments'),
  where('endedAt', '==', null),
  where('tutorIds', 'array-contains', myUid),
);
const myAssignments = await getDocs(assignmentsQuery);
const assignedResidents = new Set();
myAssignments.docs.forEach((doc) => {
  assignedResidents.add(doc.data().residentId);
});
console.log(`I'm assigned to:`, Array.from(assignedResidents));

// Compare
console.log(
  `Match:`,
  JSON.stringify(Array.from(residents).sort()) ===
    JSON.stringify(Array.from(assignedResidents).sort()),
);
```

**Expected result:**

```javascript
Tutor sees 23 tasks
Tasks from these residents: ["resident1", "resident2"]
I'm assigned to: ["resident1", "resident2"]
Match: true ✅
```

**If Match is false:** ⚠️ Something's wrong - tutor sees tasks they shouldn't

### Test C: Tutor Cannot Read Unassigned Task

```javascript
// Sign in as tutor, then try to read a specific task from a resident you're NOT assigned to
const db = getFirestore(getFirestore());

// First, find a task from an unassigned resident
const allTasks = await getDocs(query(collection(db, 'tasks'), limit(100)));
// (You should only see tasks from assigned residents if authorization is working)

// Try to access a task ID you know exists but belongs to someone else
// Replace 'taskIdFromOtherResident' with an actual task ID
try {
  const taskDoc = await getDoc(doc(db, 'tasks', 'taskIdFromOtherResident'));
  if (taskDoc.exists()) {
    console.log('❌ PROBLEM: Can read unassigned task!');
  } else {
    console.log('✅ Task exists but data is protected');
  }
} catch (error) {
  console.log('✅ Permission denied (correct):', error.message);
}
```

---

## Check 5: Verify Firestore Rules Deployed

```javascript
// Check when rules were last updated
// In Firebase Console → Firestore → Rules
// Should show recent timestamp
```

Or try this test:

```javascript
// This should fail if rules are deployed correctly
const db = getFirestore(getFirebaseApp());

// Sign in as resident
// Try to create a task without tutorIds (should work - we add them automatically)
// But the old way should still work due to our fallback
```

---

## Common Issues & Fixes

### Issue 1: Migration returned `{ processed: 0, updated: 0 }`

**Cause:** No active assignments in database

**Check:**

```javascript
const assignments = await getDocs(
  query(collection(db, 'assignments'), where('endedAt', '==', null)),
);
console.log('Active assignments:', assignments.size);
```

**If 0:** You need to create some assignments first (admin function)

### Issue 2: Tasks still don't have tutorIds

**Cause:** Migration might have failed silently

**Fix:** Run migration again (it's idempotent - safe to re-run)

```javascript
import { migrateExistingTasks } from './lib/firebase/task-sync';
const result = await migrateExistingTasks();
console.log(result);
```

### Issue 3: Tutor sees tasks from all residents

**Possible causes:**

1. Firestore rules not deployed yet
2. Tasks don't have tutorIds
3. Browser cache (try hard refresh)

**Fix:**

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Clear browser cache
# Hard refresh (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

# Re-run migration if needed
```

### Issue 4: "Permission denied" for tasks that should be accessible

**Cause:** Task doesn't have tutor in tutorIds array

**Check:**

```javascript
const taskDoc = await getDoc(doc(db, 'tasks', 'problematicTaskId'));
console.log('Task tutorIds:', taskDoc.data().tutorIds);

// Compare with assignment
const assignment = await getDocs(
  query(
    collection(db, 'assignments'),
    where('residentId', '==', taskDoc.data().userId),
    where('endedAt', '==', null),
  ),
);
console.log('Assignment tutorIds:', assignment.docs[0]?.data().tutorIds);
```

**Fix:** Manually sync that resident's tasks

```javascript
import { syncTutorIdsToTasks } from './lib/firebase/task-sync';
await syncTutorIdsToTasks(residentId, correctTutorIds);
```

---

## Success Checklist

Run through all checks above. Migration is successful if:

- [x] Migration returned positive numbers (processed > 0, updated > 0)
- [x] Migration errors array is empty
- [x] Random tasks have tutorIds field
- [x] Admin can see all tasks
- [x] Tutor only sees tasks from assigned residents
- [x] Tutor cannot read tasks from unassigned residents
- [x] Firestore rules are deployed

**If all checks pass:** ✅ **Migration successful! Issue #1 is fixed!**

---

## Next Steps After Successful Migration

1. **Enable auto-sync** (recommended):
   - See `ISSUE_1_FIX_GUIDE.md` Step 3
   - Keeps tasks in sync when assignments change

2. **Test in production:**
   - Sign in as different tutors
   - Verify they only see their residents' tasks

3. **Monitor:**
   - Watch for "Permission denied" errors
   - Check Firestore usage (should be lower now)

4. **Clean up:**
   - Remove migration code from production (keep for reference)

---

## Quick Verification Script (All-in-One)

Copy and paste this entire block into browser console:

```javascript
(async () => {
  console.log('🔍 Starting verification...\n');

  const { getFirestore, collection, query, where, limit, getDocs } = await import(
    'firebase/firestore'
  );
  const { getFirebaseApp } = await import('./lib/firebase/client');
  const db = getFirestore(getFirebaseApp());

  // Check 1: Sample tasks
  console.log('📋 Check 1: Sampling tasks...');
  const tasksQuery = query(collection(db, 'tasks'), limit(5));
  const tasksSnapshot = await getDocs(tasksQuery);
  let tasksWithTutorIds = 0;
  tasksSnapshot.docs.forEach((doc) => {
    if (doc.data().tutorIds !== undefined) tasksWithTutorIds++;
  });
  console.log(`   ${tasksWithTutorIds}/${tasksSnapshot.size} sampled tasks have tutorIds`);
  console.log(tasksWithTutorIds === tasksSnapshot.size ? '   ✅ PASS\n' : '   ❌ FAIL\n');

  // Check 2: Active assignments
  console.log('📋 Check 2: Active assignments...');
  const assignmentsQuery = query(collection(db, 'assignments'), where('endedAt', '==', null));
  const assignmentsSnapshot = await getDocs(assignmentsQuery);
  console.log(`   Found ${assignmentsSnapshot.size} active assignments`);
  console.log(assignmentsSnapshot.size > 0 ? '   ✅ PASS\n' : '   ⚠️  No active assignments\n');

  // Check 3: Current user access
  console.log('📋 Check 3: Your access...');
  const { getCurrentUserWithProfile } = await import('./lib/firebase/auth');
  const { profile } = await getCurrentUserWithProfile();
  console.log(`   You are: ${profile.role} (${profile.fullName})`);

  const allTasksYouCanSee = await getDocs(collection(db, 'tasks'));
  console.log(`   You can see: ${allTasksYouCanSee.size} tasks`);

  if (profile.role === 'admin') {
    console.log('   ✅ Admin - can see all tasks (expected)\n');
  } else if (profile.role === 'tutor') {
    const myAssignments = await getDocs(
      query(
        collection(db, 'assignments'),
        where('tutorIds', 'array-contains', profile.uid),
        where('endedAt', '==', null),
      ),
    );
    console.log(`   Assigned to ${myAssignments.size} residents`);
    console.log('   ✅ Tutor - access restricted (verify manually)\n');
  } else {
    console.log('   ✅ Resident - access restricted\n');
  }

  console.log('🎉 Verification complete!');
  console.log('📖 See VERIFY_MIGRATION.md for detailed checks');
})();
```

This will give you a quick health check. For thorough testing, follow the individual checks above.
