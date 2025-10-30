# Role-Based Authorization Audit

**Date:** October 14, 2025  
**Focus:** Authorization enforcement (not authentication)  
**Scope:** Resident, Tutor, Admin access controls

---

## Executive Summary

### Overall Assessment: ⚠️ **GOOD FOUNDATION with CRITICAL GAPS**

**Strengths:**

- ✅ **Excellent Firestore security rules** - Comprehensive role-based access control
- ✅ **Server-side role verification** in new auth utilities
- ✅ **Defense in depth** - Multiple layers of protection

**Critical Issues Found:**

- 🔴 **API routes lack authorization logic** - Only authentication, no tutor-resident checks
- 🔴 **Client-side filtering** - Tutors can query all data, filtered client-side
- 🟡 **Missing tutor-to-resident validation** in API routes
- 🟡 **Over-permissive Firestore rules** for some collections

---

## 1. Where Are Permissions Enforced?

### ✅ Firestore Security Rules (PRIMARY ENFORCEMENT)

**Location:** `firestore.rules`

**Excellent implementation:**

```javascript
// Role checking functions
function getUserRole() {
  return hasUserDoc() ? get(path(userDocPath())).data.role : null;
}

function isAdminApproved() {
  return isApproved() && getUserRole() == 'admin';
}

function isTutorApproved() {
  return isApproved() && getUserRole() == 'tutor';
}
```

**Key protections:**

1. **Users collection** (lines 65-69):
   - ✅ Users can only read/update their own profile
   - ✅ Approved tutors/admins can read/update any user

2. **Tasks collection** (lines 72-78):
   - ✅ Residents can only read/create their own tasks
   - ✅ Tutors can update tasks ONLY for rotations they own
   - ⚠️ **BUT**: Tutors can read ALL pending tasks (not just their residents)

3. **Assignments** (lines 102-122):
   - ✅ Residents can only read their own assignment
   - ✅ Tutors can only add/remove themselves from tutorIds
   - ✅ Very strict field-level validation

4. **Reflections** (lines 157-174):
   - ✅ Can only be read by resident, tutor, or admin
   - ✅ Immutable after submission
   - ✅ Good data isolation

### ⚠️ API Route Authorization (PARTIAL)

**Location:** `lib/api/auth.ts`, API routes

**What's good:**

- ✅ `requireAdminAuth()` - Verifies admin role server-side
- ✅ `requireTutorOrAdminAuth()` - Verifies tutor/admin role
- ✅ Checks Firestore for role (lines 50-75)

**What's missing:**

- 🔴 No `requireTutorCanAccessResident()` function
- 🔴 No server-side validation that tutor supervises a specific resident
- 🔴 API routes don't check tutor-to-resident assignments

---

## 2. Server-Side vs Client-Side Enforcement

### ⚠️ MIXED - Some Rely on Client Filtering

#### Server-Side (GOOD) ✅

**Firestore rules enforce:**

- User can only create tasks with their own `userId`
- Tutor can only update tasks for rotations they own
- Admin actions require admin role
- Reflections isolated by residentId/tutorId

**Example from firestore.rules:**

```javascript
// Tasks: line 74
allow create: if isSignedIn() && request.resource.data.userId == request.auth.uid;

// Reflections: line 158
allow read: if isAdminApproved() ||
  (isSignedIn() && (resource.data.residentId == request.auth.uid ||
                     resource.data.tutorId == request.auth.uid));
```

#### Client-Side Filtering (RISKY) ⚠️

**Problem areas:**

1. **`useActiveAssignments`** (lib/hooks/useActiveAssignments.ts):

   ```typescript
   // Lines 14-15: Queries ALL active assignments
   const qRef = query(collection(db, 'assignments'), where('endedAt', '==', null));
   ```

   - ✅ Firestore rules protect (line 103), but inefficient
   - ⚠️ Client gets all data, then filters in `useTutorDashboardData`

2. **`useTutorDashboardData`** (lib/hooks/useTutorDashboardData.ts):

   ```typescript
   // Lines 54-56: Gets ALL pending petitions and tasks
   const [petPage, taskPage] = await Promise.all([
     listRotationPetitions({ status: 'pending' }),
     listTasks({ status: 'pending' }),
   ]);

   // Lines 73-81: Filters CLIENT-SIDE
   const filteredPetitions = useMemo(() => {
     const set = supervisedResidentIds;
     return (petitions || []).filter((p) => set.has(p.residentId));
   }, [petitions, supervisedResidentIds]);
   ```

   - ⚠️ Relies on Firestore rules, but fetches unnecessary data
   - ⚠️ If rules have a bug, client sees too much

3. **`useReflectionsForResident`** (lib/hooks/useReflections.ts):

   ```typescript
   // Lines 67-70: Queries by residentId (passed from client)
   const qRef = query(
     collection(db, 'reflections'),
     where('residentId', '==', residentId),
     orderBy('submittedAt', 'desc'),
   );
   ```

   - ⚠️ Trusts client to pass correct residentId
   - ✅ Protected by Firestore rules (line 158)
   - 🔴 If tutor calls this with wrong residentId, Firestore allows it!

---

## 3. Can a Resident Access Another Resident's Data?

### 📊 **Verdict: ✅ MOSTLY PROTECTED, ⚠️ WITH CAVEATS**

#### Protected Collections ✅

**Tasks** (firestore.rules line 73):

```javascript
allow read: if isTutorOrAdminApproved() ||
  (isSignedIn() && resource.data.userId == request.auth.uid);
```

- ✅ Resident can ONLY read their own tasks
- ✅ Cannot query tasks where userId != their UID

**Reflections** (firestore.rules line 158):

```javascript
allow read: if isAdminApproved() ||
  (isSignedIn() && (resource.data.residentId == request.auth.uid ||
                     resource.data.tutorId == request.auth.uid));
```

- ✅ Resident can ONLY read reflections where they are the resident
- ✅ Strong isolation

**Assignments** (firestore.rules line 103):

```javascript
allow read: if isAdminApproved() ||
  (isSignedIn() && resource.data.residentId == request.auth.uid) ||
  isTutorApproved();
```

- ✅ Resident can ONLY read their own assignment
- ⚠️ **BUT**: Tutors can read ALL assignments (no filtering)

#### Readable by All Signed-In Users ⚠️

**These collections allow ANY authenticated user to read:**

1. **Rotations** (line 82):

   ```javascript
   allow read: if isSignedIn();
   ```

   - ⚠️ Any resident can see all rotations (probably OK - these are curriculum)

2. **Rotation Nodes** (line 88):

   ```javascript
   allow read: if isSignedIn();
   ```

   - ⚠️ Any resident can see all rotation details (probably OK - public curriculum)

3. **Morning Meetings** (line 132):

   ```javascript
   allow read: if isSignedIn();
   ```

   - ⚠️ Any resident can see all morning meetings (probably OK - shared schedule)

4. **On-Call Assignments** (line 138):

   ```javascript
   allow read: if isSignedIn();
   ```

   - 🔴 **POTENTIAL ISSUE**: Any resident can see who's on-call
   - Might be intentional (need to know who's available)
   - Or might leak staff schedule information

#### Users Collection ⚠️

**firestore.rules line 67:**

```javascript
allow read: if isOwner(uid) || isTutorOrAdminApproved();
```

- ✅ Residents can ONLY read their own user document
- ✅ Cannot enumerate or read other residents
- ✅ Tutors/admins can read all (intentional for their dashboard)

### 🔍 Test Cases

**Test 1: Resident A tries to read Resident B's tasks**

```javascript
// Firestore will reject:
collection('tasks').where('userId', '==', 'residentB_uid');
// Result: ✅ BLOCKED - Firestore rules prevent this
```

**Test 2: Resident A tries to read Resident B's user profile**

```javascript
// Firestore will reject:
doc('users', 'residentB_uid').get();
// Result: ✅ BLOCKED - Must be owner or tutor/admin
```

**Test 3: Resident A tries to read Resident B's reflections**

```javascript
// Firestore will reject:
collection('reflections').where('residentId', '==', 'residentB_uid');
// Result: ✅ BLOCKED - Can only read where residentId == own UID
```

---

## 4. Can a Tutor Only Access Their Assigned Residents?

### 📊 **Verdict: 🔴 PARTIALLY ENFORCED - CRITICAL GAPS**

#### What Works ✅

**Tasks - Update restrictions** (firestore.rules line 76):

```javascript
allow update: if isAdminApproved() ||
  (isTutorApproved() && isOwnerOfRotation(resource.data.rotationId)) ||
  (isSignedIn() && resource.data.userId == request.auth.uid);
```

- ✅ Tutor can ONLY update tasks for rotations they own
- ✅ Very good restriction

**Assignments - Self-management only** (firestore.rules lines 105-120):

```javascript
allow update: if isAdminApproved() || (
  isTutorApproved() &&
  resource.data.endedAt == null &&
  isOwnerOfRotation(resource.data.rotationId) &&
  // Only tutorIds may change; all other fields unchanged
  // ... (strict validation)
  // Can only add/remove self
);
```

- ✅ Tutor can ONLY add/remove themselves from tutorIds
- ✅ Cannot modify other tutors' assignments
- ✅ Cannot change resident assignments

#### What Doesn't Work 🔴

**Tasks - Read access** (firestore.rules line 73):

```javascript
allow read: if isTutorOrAdminApproved() ||
  (isSignedIn() && resource.data.userId == request.auth.uid);
```

- 🔴 **CRITICAL**: Tutor can read ALL tasks from ALL residents
- 🔴 No restriction to assigned residents
- 🔴 Relies on client-side filtering

**Assignments - Read access** (firestore.rules line 103):

```javascript
allow read: if isAdminApproved() ||
  (isSignedIn() && resource.data.residentId == request.auth.uid) ||
  isTutorApproved();
```

- 🔴 **CRITICAL**: Tutor can read ALL assignments
- 🔴 No restriction to residents they supervise

**Rotation Petitions - Read access** (firestore.rules line 94):

```javascript
allow read: if isAdminApproved() || isTutorApproved();
```

- 🔴 **CRITICAL**: Tutor can read ALL rotation petitions
- 🔴 Not restricted to their residents

**Reflections - Read access** (firestore.rules line 158):

```javascript
allow read: if isAdminApproved() ||
  (isSignedIn() && (resource.data.residentId == request.auth.uid ||
                     resource.data.tutorId == request.auth.uid));
```

- ✅ **GOOD**: Tutor can only read reflections where they are the tutor
- ✅ Properly restricted

#### Client-Side "Solution" ⚠️

**useTutorDashboardData.ts** does filtering:

```typescript
// Lines 36-42: Determines supervised residents
const supervisedResidentIds = useMemo(() => {
  if (!me) return new Set<string>();
  const ids = (assignments || [])
    .filter((a: Assignment) => (a.tutorIds || []).includes(me.uid))
    .map((a) => a.residentId);
  return new Set(ids);
}, [assignments, me]);

// Lines 73-81: Filters tasks client-side
const filteredTasks = useMemo(() => {
  const set = supervisedResidentIds;
  return (tasks || []).filter((t) => set.has(t.userId));
}, [tasks, supervisedResidentIds]);
```

- ⚠️ This works, but:
  - Tutor receives ALL tasks over the wire
  - Filtering happens in browser
  - Inefficient and potential information leak
  - If client code has a bug, tutor sees everything

### 🔍 Test Cases

**Test 1: Tutor A tries to read tasks from Resident B (not assigned)**

```javascript
// Current behavior:
collection('tasks').where('status', '==', 'pending').get();
// Result: ⚠️ Returns ALL pending tasks (Firestore allows)
// Client filters to only show assigned residents
// Risk: If client filtering fails, tutor sees all
```

**Test 2: Tutor A tries to update a task for Resident B (not assigned)**

```javascript
// Firestore will check:
doc('tasks', taskId).update({ status: 'approved' });
// Result: ✅ BLOCKED if resident's rotation not owned by tutor
// But ⚠️ only if rotation ownership is set up correctly
```

**Test 3: Tutor A tries to read Resident B's reflections**

```javascript
collection('reflections').where('residentId', '==', 'residentB_uid').get();
// Result: ✅ BLOCKED - tutorId != tutor A's UID
```

---

## 5. Are Admin Routes Properly Protected?

### 📊 **Verdict: ✅ YES (After Recent Fixes)**

#### API Routes - Admin Only ✅

**All admin import/management routes now check role:**

1. **`app/api/morning-meetings/import/route.ts`**:

   ```typescript
   const auth = await requireAdminAuth(req);
   ```

   - ✅ Verifies admin role in Firestore
   - ✅ Returns 403 if not admin

2. **`app/api/on-call/import/route.ts`**:

   ```typescript
   const auth = await requireAdminAuth(req);
   ```

   - ✅ Properly protected

3. **All ICS endpoints**: Now require authentication
   - ✅ Fixed in recent security update

#### Firestore Rules - Admin Only ✅

**Example collections:**

**Rotations** (line 83):

```javascript
allow create, update, delete: if isAdminApproved();
```

**Morning Meetings** (line 133):

```javascript
allow create, update, delete: if isAdminApproved();
```

**On-Call** (line 139):

```javascript
allow create, update, delete: if isAdminApproved();
```

- ✅ All admin operations properly restricted
- ✅ Checks both role AND approval status

#### Frontend Protection ⚠️

**Pages like `/admin/*` check role client-side:**

```typescript
// app/admin/on-call/page.tsx lines 25-37
useEffect(() => {
  (async () => {
    try {
      const { firebaseUser, profile } = await getCurrentUserWithProfile();
      if (!firebaseUser) return (window.location.href = '/auth');
      if (!profile || profile.status === 'pending')
        return (window.location.href = '/awaiting-approval');
      if (profile.role !== 'admin') return (window.location.href = '/auth');
    } catch (error) {
      window.location.href = '/auth';
    }
  })();
}, []);
```

- ⚠️ Client-side routing protection (can be bypassed)
- ✅ **BUT**: Server-side Firestore rules and API auth provide real protection
- ✅ Client checks are just UX (preventing confused users)

### 🔍 Admin Protection Test Cases

**Test 1: Non-admin tries to import morning meetings**

```javascript
fetch('/api/morning-meetings/import', {
  method: 'POST',
  headers: { Authorization: 'Bearer <resident-token>' },
  body: csvData,
});
// Result: ✅ 403 Forbidden (requireAdminAuth blocks)
```

**Test 2: Non-admin tries to create a rotation in Firestore**

```javascript
addDoc(collection(db, 'rotations'), rotationData);
// Result: ✅ BLOCKED by Firestore rules (line 83)
```

**Test 3: Resident navigates to /admin/on-call**

```javascript
// Browser URL: http://localhost:3000/admin/on-call
// Result: ⚠️ Page loads initially
// Then: ✅ Redirected to /auth by useEffect
// If they bypass redirect: ✅ API calls fail (no admin token)
```

---

## 🔴 Critical Authorization Issues Found

### Issue #1: Tutors Can Read All Tasks (Not Just Their Residents)

**Location:** `firestore.rules` line 73

**Current rule:**

```javascript
allow read: if isTutorOrAdminApproved() ||
  (isSignedIn() && resource.data.userId == request.auth.uid);
```

**Problem:**

- Tutor can query ALL tasks
- No restriction to residents they supervise
- Client-side filtering is a workaround, not a solution

**Recommended fix:**

```javascript
// Add helper function
function isTutorForTask(taskData) {
  // Check if tutor is assigned to the resident who owns this task
  let assignment = get(/databases/$(database)/documents/assignments/
    where('residentId', '==', taskData.userId)
    where('endedAt', '==', null)
    .limit(1));
  return assignment != null && (request.auth.uid in assignment.data.tutorIds);
}

// Update rule
allow read: if isAdminApproved() ||
  (isSignedIn() && resource.data.userId == request.auth.uid) ||
  (isTutorApproved() && isTutorForTask(resource.data));
```

**Risk if not fixed:**

- Tutor can see sensitive information about all residents
- Violates least-privilege principle
- Information disclosure if client filtering fails

---

### Issue #2: Tutors Can Read All Assignments

**Location:** `firestore.rules` line 103

**Current rule:**

```javascript
allow read: if isAdminApproved() ||
  (isSignedIn() && resource.data.residentId == request.auth.uid) ||
  isTutorApproved();
```

**Problem:**

- Any tutor can read all assignments
- Can see which residents are assigned to other tutors
- Can see rotation assignments for residents they don't supervise

**Recommended fix:**

```javascript
allow read: if isAdminApproved() ||
  (isSignedIn() && resource.data.residentId == request.auth.uid) ||
  (isTutorApproved() && (request.auth.uid in resource.data.tutorIds));
```

**Risk if not fixed:**

- Privacy leak: tutors see other tutors' assignments
- Could lead to inappropriate contact with residents

---

### Issue #3: API Routes Don't Validate Tutor-Resident Relationships

**Location:** API routes don't exist for tutor-specific operations yet

**Problem:**

- No API endpoints for tutors to approve tasks
- If added later, must validate tutor supervises resident

**Recommended implementation** (for future):

```typescript
// lib/api/auth.ts
export async function requireTutorForResident(
  req: NextRequest,
  residentId: string,
): Promise<AuthResult> {
  const auth = await verifyAuthToken(req);

  const { getFirestore } = await import('firebase-admin/firestore');
  const app = getAdminApp();
  const db = getFirestore(app);

  // Check user is tutor
  const userDoc = await db.collection('users').doc(auth.uid).get();
  if (!userDoc.exists || userDoc.data()?.role !== 'tutor') {
    throw new Error('Forbidden: Tutor access required');
  }

  // Check tutor is assigned to this resident
  const assignments = await db
    .collection('assignments')
    .where('residentId', '==', residentId)
    .where('endedAt', '==', null)
    .where('tutorIds', 'array-contains', auth.uid)
    .limit(1)
    .get();

  if (assignments.empty) {
    throw new Error('Forbidden: You are not assigned to this resident');
  }

  return auth;
}
```

---

### Issue #4: On-Call Data Readable by All Users

**Location:** `firestore.rules` lines 137-143

**Current rules:**

```javascript
match /onCallAssignments/{id} {
  allow read: if isSignedIn();
  allow create, update, delete: if isAdminApproved();
}
```

**Problem:**

- Any signed-in user (including residents) can see who's on-call
- May leak staff scheduling information

**Questions to answer:**

1. Should residents see who's on-call? (Maybe yes - need to know who's available)
2. Should they see ALL shifts or just current/upcoming?
3. Should they see personal details?

**Recommended fix (if should be restricted):**

```javascript
match /onCallAssignments/{id} {
  // Only show user's own assignments + current day for everyone
  allow read: if isSignedIn() && (
    resource.data.userId == request.auth.uid ||
    isTutorOrAdminApproved() ||
    (resource.data.date >= request.time && resource.data.date < request.time + duration.value(1, 'd'))
  );
  allow create, update, delete: if isAdminApproved();
}
```

---

## 📋 Recommendations Priority

### 🔴 CRITICAL (Fix Immediately)

1. **Fix Firestore rules for tasks** - Restrict tutor read access to assigned residents only
2. **Fix Firestore rules for assignments** - Restrict tutor read access to their assignments only
3. **Add server-side tutor-to-resident validation** if creating tutor APIs

### 🟡 HIGH (Fix Soon)

4. **Review on-call data access** - Determine appropriate access levels
5. **Add server-side query filtering** - Move filtering from client to server
6. **Add `requireTutorForResident()` utility** - For future tutor APIs

### 🟢 MEDIUM (Improve Over Time)

7. **Add audit logging** - Log when tutors/admins access resident data
8. **Add rate limiting** - Prevent enumeration attacks
9. **Consider field-level permissions** - Hide sensitive fields from tutors

---

## ✅ What's Working Well

1. **Firestore rules foundation** - Excellent role checking and approval gating
2. **Resident data isolation** - Residents can only see their own data
3. **Admin restrictions** - All admin operations properly protected
4. **Update restrictions** - Tutors can only update tasks for owned rotations
5. **Reflection privacy** - Good isolation by residentId/tutorId
6. **Assignment immutability** - Tutors can only add/remove themselves

---

## 🧪 Recommended Security Testing

### Test Suite to Create

```typescript
describe('Authorization Tests', () => {
  describe('Resident Isolation', () => {
    it('Resident A cannot read Resident B tasks', async () => {
      // Sign in as Resident A
      // Try to query tasks where userId = Resident B
      // Expect: Firestore permission denied
    });

    it('Resident cannot read other residents profiles', async () => {
      // Sign in as Resident A
      // Try to read doc('users', residentB_id)
      // Expect: Permission denied
    });
  });

  describe('Tutor Restrictions', () => {
    it('Tutor can only update tasks for owned rotations', async () => {
      // Sign in as Tutor A
      // Try to update task for rotation owned by Tutor B
      // Expect: Permission denied
    });

    it('Tutor cannot modify other tutors in assignment', async () => {
      // Sign in as Tutor A
      // Try to add Tutor B to assignment.tutorIds
      // Expect: Permission denied
    });
  });

  describe('Admin Protection', () => {
    it('Non-admin cannot import data', async () => {
      // Sign in as resident or tutor
      // Try to call /api/morning-meetings/import
      // Expect: 403 Forbidden
    });

    it('Non-admin cannot create rotations', async () => {
      // Sign in as resident or tutor
      // Try to addDoc to rotations collection
      // Expect: Firestore permission denied
    });
  });
});
```

---

## 📊 Authorization Matrix

| Resource               | Create | Read                       | Update                 | Delete |
| ---------------------- | ------ | -------------------------- | ---------------------- | ------ |
| **Own User Profile**   | Self   | Self, Tutor\*, Admin       | Self, Tutor\*, Admin   | -      |
| **Other User Profile** | -      | Tutor\*, Admin             | Tutor\*, Admin         | -      |
| **Own Tasks**          | Self   | Self, Tutor†, Admin        | Self, Tutor‡, Admin    | Admin  |
| **Other Tasks**        | -      | Tutor§, Admin              | Tutor‡, Admin          | Admin  |
| **Rotations**          | Admin  | All¶                       | Admin                  | Admin  |
| **Assignments**        | Admin  | Self, Tutor\*\*, Admin     | Self††, Tutor‡‡, Admin | Admin  |
| **Reflections**        | Self   | Self, InvolvedTutor, Admin | Admin only             | -      |
| **On-Call**            | Admin  | All§§                      | Admin                  | Admin  |

**Legend:**

- `*` = Approved tutors/admins only
- `†` = Tutor can read ALL tasks (🔴 Issue #1)
- `‡` = Only for rotations tutor owns
- `§` = 🔴 **CRITICAL**: Tutor can read ALL tasks
- `¶` = Public curriculum (intentional)
- `**` = Tutor can read ALL assignments (🔴 Issue #2)
- `††` = Can only update own fields (settings, etc.)
- `‡‡` = Can only add/remove self from tutorIds
- `§§` = 🟡 May need restriction

---

## 🎯 Summary & Action Items

### Current State: 7/10 Security Score

**Pros:**

- Excellent Firestore rules foundation
- Good resident isolation
- Admin operations well-protected
- Update operations properly restricted

**Cons:**

- Tutors can read too much data
- Relies on client-side filtering
- No server-side tutor-to-resident validation
- Potential information leaks

### Immediate Actions:

1. **Update Firestore rules** for tasks and assignments (see Issue #1 and #2)
2. **Add server-side filtering** in hooks/APIs
3. **Create tutor-specific auth utility** for future APIs
4. **Add security tests** to prevent regressions
5. **Review on-call data access** policy

### Long-term Improvements:

- Audit logging for sensitive data access
- Field-level permissions
- Regular security reviews
- Penetration testing

---

**Prepared by:** AI Security Audit  
**Date:** October 14, 2025  
**Status:** Analysis Complete - Fixes Recommended
