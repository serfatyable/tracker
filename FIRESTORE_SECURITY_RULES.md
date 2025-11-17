# Firestore Security Rules - Enhanced Documentation

## Overview

This document describes the comprehensive security enhancements made to the Tracker application's Firestore security rules. The enhanced rules provide defense-in-depth validation with:

1. **Schema validation** - Required fields, types, and format validation
2. **Rate limiting** - Time-based throttling for document creation
3. **Field immutability** - Prevent modification of critical fields after creation
4. **Cross-collection validation** - Ensure referenced documents exist before operations
5. **Role-based access control** - Existing authorization model maintained and strengthened

---

## Table of Contents

- [Helper Functions](#helper-functions)
  - [Authentication & Role Functions](#authentication--role-functions)
  - [Validation Functions](#validation-functions)
  - [Schema Validation Functions](#schema-validation-functions)
- [Collection Rules](#collection-rules)
  - [Users Collection](#users-collection)
  - [Tasks Collection](#tasks-collection)
  - [Rotations Collection](#rotations-collection)
  - [Rotation Nodes](#rotation-nodes)
  - [Rotation Petitions](#rotation-petitions)
  - [Assignments](#assignments)
  - [Reflections](#reflections)
  - [Exams](#exams)
  - [Other Collections](#other-collections)
- [Testing](#testing)
- [Deployment](#deployment)

---

## Helper Functions

### Authentication & Role Functions

These functions remain unchanged from the original implementation and provide the foundation for role-based access control:

- `isSignedIn()` - Check if user is authenticated
- `getUserRole()` - Get the current user's role (resident/tutor/admin)
- `isAdmin()`, `isTutor()`, `isTutorOrAdmin()` - Role checks
- `isApproved()` - Check if user status is 'active' or 'approved'
- `isAdminApproved()`, `isTutorApproved()`, `isTutorOrAdminApproved()` - Combined role and approval checks
- `isOwner(uid)` - Check if current user matches the specified UID
- `isOwnerOfRotation(rotationId)` - Check if current user is in rotation's ownerTutorIds
- `isTutorForTask(taskData)` - Check if tutor is assigned to task's resident

### Validation Functions

New helper functions for defensive validation:

#### String Validation

```javascript
function isValidString(value, minLength, maxLength)
```

Validates that a value is a string and within specified length bounds.

**Example:**

```javascript
isValidString(data.name, 1, 200); // Name must be 1-200 characters
```

#### Email Validation

```javascript
function isValidEmail(email)
```

Basic email format validation using regex pattern.

#### Date Validation

```javascript
function isValidISODate(dateStr)
```

Validates ISO 8601 date format (YYYY-MM-DD).

**Example:**

```javascript
isValidISODate('2023-01-15'); // true
isValidISODate('01/15/2023'); // false
```

#### Timestamp Validation

```javascript
function isValidTimestamp(value)
```

Ensures value is a Firestore Timestamp type.

#### Number Validation

```javascript
function isValidNumber(value, min, max)
```

Validates numeric values within specified range.

**Example:**

```javascript
isValidNumber(data.count, 0, 10000); // Count must be 0-10000
```

#### Array Validation

```javascript
function isValidArray(value, maxSize)
```

Validates array type and enforces maximum size limit.

**Example:**

```javascript
isValidArray(data.tutorIds, 50); // Max 50 tutors per assignment
```

#### Cross-Collection Validation

```javascript
function rotationExists(rotationId)
function userExists(userId)
```

Verify referenced documents exist before allowing operations.

**Example:**

```javascript
// Only create task if rotation exists
rotationExists(request.resource.data.rotationId);
```

#### Rate Limiting

```javascript
function hasThrottlePassed(minSecondsBetween)
```

Basic rate limiting by checking time since last operation.

**Note:** This is a simple implementation. For production rate limiting, consider using Cloud Functions with Redis/Upstash or Firestore-based counters.

#### Immutability Validation

```javascript
function immutableFieldsUnchanged(immutableFields)
```

Ensures specified fields haven't changed during update operations.

### Schema Validation Functions

Comprehensive schema validators for each document type:

#### User Schema

```javascript
function isValidUserSchema(data)
```

**Validates:**

- Required fields: `role`, `status`, `settings`
- Valid roles: `resident`, `tutor`, `admin`
- Valid statuses: `pending`, `active`, `disabled`
- Valid languages: `en`, `he`
- Resident-specific: `residencyStartDate` (YYYY-MM-DD format)

#### Task Schema

```javascript
function isValidTaskSchema(data)
```

**Validates:**

- Required fields: `userId`, `rotationId`, `itemId`, `status`
- Valid statuses: `pending`, `approved`, `rejected`
- ID field lengths: 1-128 characters
- Numeric bounds: `count`, `requiredCount` (0-10000)
- Array limits: `tutorIds` (max 50)

#### Rotation Schema

```javascript
function isValidRotationSchema(data)
```

**Validates:**

- Required fields: `name`, `createdAt`
- Name length: 1-200 characters
- Valid statuses: `active`, `inactive`, `finished`
- Array limits: `ownerTutorIds` (max 100)

#### Assignment Schema

```javascript
function isValidAssignmentSchema(data)
```

**Validates:**

- Required fields: `residentId`, `rotationId`, `tutorIds`, `status`
- Valid statuses: `inactive`, `active`, `finished`
- ID field lengths: 1-128 characters
- Array limits: `tutorIds` (max 50)

#### Reflection Schema

```javascript
function isValidReflectionSchema(data)
```

**Validates:**

- Required fields: `taskOccurrenceId`, `taskType`, `templateKey`, `templateVersion`, `authorId`, `authorRole`, `residentId`, `answers`
- Valid author roles: `resident`, `tutor`
- Template version range: 1-1000
- String length constraints on all ID fields

#### Rotation Petition Schema

```javascript
function isValidRotationPetitionSchema(data)
```

**Validates:**

- Required fields: `residentId`, `rotationId`, `type`, `status`, `requestedAt`
- Valid types: `activate`, `finish`
- Valid statuses: `pending`, `approved`, `denied`

#### Exam Schema

```javascript
function isValidExamSchema(data)
```

**Validates:**

- Required fields: `examDate`, `subjects`, `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `isActive`
- Array limits: `subjects` (max 10)
- Boolean type: `isActive`

---

## Collection Rules

### Users Collection

**Path:** `/users/{uid}`

#### Create

**Who:** Any authenticated user (for their own document only)

**Validation:**

- Must be owner: `request.auth.uid == uid`
- Valid schema: All required fields present
- Resident must have `residencyStartDate` in YYYY-MM-DD format
- Language must be 'en' or 'he'

#### Read

**Who:** Document owner OR approved tutor/admin

#### Update

**Who:** Document owner OR approved tutor/admin

**Immutability:**

- ❌ **Cannot change:** `role`
- ✅ **Can change:** `status` (admin only), `settings`, `fullName`, etc.

#### Delete

**Who:** Approved admin only

**Security Note:** Users cannot delete their own accounts to prevent data loss. Admin approval required.

---

### Tasks Collection

**Path:** `/tasks/{taskId}`

#### Create

**Who:** Any authenticated user (for their own tasks only)

**Validation:**

- Valid schema: Required fields `userId`, `rotationId`, `itemId`, `status`
- Must be owner: `request.resource.data.userId == request.auth.uid`
- **Cross-collection:** Rotation must exist
- **Cross-collection:** User must exist
- Status must be valid: `pending`, `approved`, `rejected`
- Count/requiredCount bounds: 0-10000

#### Read

**Who:**

- Document owner (resident)
- Assigned tutor (via `tutorIds` array or rotation ownership)
- Approved admin

#### Update

**Who:**

- Document owner (resident) - can update their own tasks
- Assigned tutor - can update for rotations they own
- Approved admin - can update any task

**Immutability:**

- ❌ **Cannot change:** `userId`, `rotationId`, `itemId`, `createdAt`
- ✅ **Can change:** `status`, `count`, `note`, `feedback`

#### Delete

**Who:** Document owner OR approved admin

**Use Case:** Residents can delete their own task logs; admins can clean up data.

---

### Rotations Collection

**Path:** `/rotations/{rotationId}`

#### Create

**Who:** Approved admin only

**Validation:**

- Valid schema: Required fields `name`, `createdAt`
- Name length: 1-200 characters
- Valid status if provided

#### Read

**Who:** Everyone (including unauthenticated)

**Rationale:** Public read access needed for signup form where users select rotations before authentication.

#### Update

**Who:** Approved admin only

**Immutability:**

- ❌ **Cannot change:** `createdAt`
- ✅ **Can change:** `name`, `status`, `ownerTutorIds`, `description`, etc.

#### Delete

**Who:** Approved admin only

---

### Rotation Nodes

**Path:** `/rotationNodes/{nodeId}`

Rotation nodes represent the hierarchical structure within rotations (categories, topics, subtopics).

#### Create

**Who:** Approved admin only

**Validation:**

- Required fields: `rotationId`, `type`, `name`, `order`
- Valid types: `category`, `subject`, `topic`, `subTopic`, `subSubTopic`, `leaf`
- Name length: 1-200 characters
- **Cross-collection:** Rotation must exist

#### Read

**Who:** All authenticated users

#### Update

**Who:** Approved admin only

**Immutability:**

- ❌ **Cannot change:** `rotationId`
- ✅ **Can change:** `name`, `order`, `type`, `notes`, `links`, etc.

#### Delete

**Who:** Approved admin only

---

### Rotation Petitions

**Path:** `/rotationPetitions/{petitionId}`

Residents create petitions to activate or finish rotations; tutors/admins approve/deny them.

#### Create

**Who:** Any authenticated user (for themselves only)

**Validation:**

- Valid schema with all required fields
- Must be owner: `residentId == request.auth.uid`
- Initial status must be `pending`
- Valid type: `activate` or `finish`
- **Cross-collection:** Rotation must exist
- **Cross-collection:** Resident must exist

#### Read

**Who:**

- Document owner (resident)
- Approved tutor
- Approved admin

**Rationale:** Residents must read their own petitions to check for pending requests before creating new ones.

#### Update

**Who:**

- Approved admin - can update any petition
- Approved tutor - can approve/deny petitions for rotations they own

**Validation:**

- Status transition must be: `pending` → `approved` or `denied`

**Immutability:**

- ❌ **Cannot change:** `residentId`, `rotationId`, `type`, `requestedAt`
- ✅ **Can change:** `status`, `resolvedAt`, `resolvedBy`, `reason`

#### Delete

**Who:** Nobody (petitions are immutable records)

---

### Assignments

**Path:** `/assignments/{assignmentId}`

Assignments link residents to rotations and assign tutors for supervision.

#### Create

**Who:** Approved admin only

**Validation:**

- Valid schema with all required fields
- **Cross-collection:** Rotation must exist
- **Cross-collection:** Resident must exist

#### Read

**Who:**

- Approved admin - can read all
- Resident - can read their own assignments
- Approved tutor - can read all assignments (to see supervision opportunities)

#### Update

**Who:**

- Approved admin - full update access
- Approved tutor - limited update (can only add/remove themselves from `tutorIds`)

**Tutor Self-Assignment Rules:**

- Can only modify active assignments
- Must own the rotation
- Can only change `tutorIds` field
- Must add exactly 1 tutor (themselves) OR remove exactly 1 tutor (themselves)
- Cannot change `residentId`, `rotationId`, `startedAt`, `endedAt`, `status`

**Immutability:**

- ❌ **Cannot change:** `residentId`, `rotationId`
- ✅ **Can change:** `tutorIds`, `status`, `startedAt`, `endedAt`

#### Delete

**Who:** Approved admin only

---

### Reflections

**Path:** `/reflections/{rid}`

Reflections are structured self-assessments completed by residents or tutors after tasks.

#### Create

**Who:** Any authenticated user (must be the author)

**Validation:**

- Valid schema with all required fields
- Must be author: `authorId == request.auth.uid`
- Valid author role: `resident` or `tutor`
- **Cross-collection:** Resident must exist

#### Read

**Who:**

- Approved admin
- Resident in the reflection (`residentId`)
- Tutor in the reflection (`tutorId`)

#### Update

**Who:** Approved admin only

**Purpose:** Admins can add `adminComment` to provide feedback.

**Immutability (after submission):**
After `submittedAt` is set, the following fields become immutable:

- ❌ `taskOccurrenceId`
- ❌ `answers`
- ❌ `authorId`
- ❌ `authorRole`
- ❌ `residentId`
- ❌ `tutorId`
- ❌ `templateKey`
- ❌ `templateVersion`
- ❌ `submittedAt`
- ✅ `adminComment` (admin can add/update)

#### Delete

**Who:** Nobody (reflections are permanent records)

---

### Exams

**Path:** `/exams/{examId}`

Exam documents contain exam schedules, subjects, study materials, and past exam archives.

#### Create

**Who:** Approved tutor OR approved admin

**Validation:**

- Valid schema with all required fields
- Subjects array: max 10 items
- All timestamp fields must be valid

#### Read

**Who:** All authenticated users

**Rationale:** All residents need access to exam information for study purposes.

#### Update

**Who:** Approved tutor OR approved admin

**Immutability:**

- ❌ **Cannot change:** `createdAt`, `createdBy`
- ✅ **Can change:** `examDate`, `subjects`, `updatedAt`, `updatedBy`, `isActive`, `studyMaterials`

#### Delete

**Who:** Approved tutor OR approved admin

---

### Other Collections

#### Announcements

- **Create/Update/Delete:** Approved admin
- **Read:** All authenticated users
- **Immutability:** `createdAt` cannot change

#### Morning Meetings

- **Create/Update/Delete:** Approved admin
- **Read:** All authenticated users
- **Immutability:** `date`, `dateKey` cannot change

#### On-Call Assignments

- **Create/Update/Delete:** Approved admin
- **Read:** All authenticated users
- **Validation:** `endAt` must be after `startAt`
- **Immutability:** `userId`, `dateKey` cannot change

#### On-Call Days

- **Create/Update/Delete:** Approved admin
- **Read:** All authenticated users
- **Immutability:** `dateKey`, `date` cannot change

#### On-Call Shifts

- **Create/Update/Delete:** Approved admin
- **Read:** All authenticated users

#### On-Call Aliases

- **Create/Update/Delete:** Approved admin
- **Read:** Approved admin only

#### Reflection Templates

- **Create/Update/Delete:** Approved admin
- **Read:** All authenticated users (UI filters to `status == 'published'`)
- **Validation:** Template version 1-1000, max 100 task types, max 50 sections

---

## Testing

### Test Suite Setup

The security rules test suite is located at:

```
__tests__/firestore-security-rules.test.ts
```

### Running Tests

**Prerequisites:**

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Start Firebase emulators:

   ```bash
   firebase emulators:start --only firestore,auth
   ```

3. Run security rules tests:
   ```bash
   pnpm test:rules
   ```

**Automated (emulators + tests):**

```bash
pnpm test:rules:emulators
```

### Test Categories

The test suite covers:

1. **Schema Validation Tests**
   - Required fields enforcement
   - Data type validation
   - Format validation (dates, emails, enums)
   - String length constraints
   - Numeric bounds
   - Array size limits

2. **Immutability Tests**
   - Critical fields cannot change after creation
   - `createdAt`, `createdBy`, `userId`, etc.
   - Timestamp immutability
   - ID field immutability

3. **Cross-Collection Validation Tests**
   - Referenced documents must exist
   - Tasks require existing rotation
   - Assignments require existing resident + rotation
   - Reflections require existing resident
   - Petitions require existing rotation + resident

4. **Access Control Tests**
   - Role-based permissions (resident/tutor/admin)
   - Ownership verification
   - Approval status checks
   - Self-modification rules

5. **Edge Cases**
   - Empty arrays
   - Missing optional fields
   - Maximum array sizes
   - Boundary numeric values

### Test Coverage

The test suite includes **60+ test cases** covering all collections:

- ✅ Users (10 tests)
- ✅ Tasks (12 tests)
- ✅ Rotations (6 tests)
- ✅ Rotation Nodes (3 tests)
- ✅ Rotation Petitions (8 tests)
- ✅ Assignments (6 tests)
- ✅ Reflections (8 tests)
- ✅ Exams (7 tests)

---

## Deployment

### Deploy Security Rules

```bash
# Authenticate with Firebase
firebase login

# Select your project
firebase use <project-id>

# Deploy rules only
firebase deploy --only firestore:rules
```

### Deployment Checklist

Before deploying to production:

1. ✅ Run full test suite

   ```bash
   pnpm test:rules:emulators
   ```

2. ✅ Review rule changes

   ```bash
   git diff firestore.rules
   ```

3. ✅ Test with emulator UI
   - Start emulators: `firebase emulators:start`
   - Visit http://127.0.0.1:4000
   - Manually test critical operations

4. ✅ Check for breaking changes
   - Review immutability rules
   - Check cross-collection dependencies
   - Verify role permissions

5. ✅ Deploy to staging first (if available)

6. ✅ Monitor production logs after deployment
   ```bash
   firebase firestore:logs --limit 100
   ```

### Rollback Plan

If issues occur after deployment:

1. Revert to previous rules:

   ```bash
   git checkout HEAD~1 firestore.rules
   firebase deploy --only firestore:rules
   ```

2. Investigate failures in Firebase Console
   - Check Firestore logs
   - Review denied operation patterns
   - Identify breaking changes

3. Fix and redeploy

---

## Security Best Practices

### 1. Defense in Depth

The enhanced rules provide multiple layers of validation:

- **Layer 1:** Authentication (user must be signed in)
- **Layer 2:** Role-based access (admin/tutor/resident)
- **Layer 3:** Ownership verification (user owns the document)
- **Layer 4:** Schema validation (correct data types and formats)
- **Layer 5:** Cross-collection validation (referenced docs exist)
- **Layer 6:** Immutability enforcement (critical fields locked)

### 2. Principle of Least Privilege

Users have minimal necessary permissions:

- Residents can only manage their own data
- Tutors can only access assigned residents
- Admins have elevated but scoped access
- Public read limited to necessary collections (rotations)

### 3. Immutability for Audit Trail

Critical fields are immutable to maintain data integrity:

- `createdAt` - Preserve creation timestamp
- `createdBy` - Prevent impersonation
- `userId` - Prevent ownership transfer
- `rotationId` - Prevent data corruption
- `authorId` - Maintain authorship

### 4. Cross-Collection Validation

Prevent orphaned records and maintain referential integrity:

- Tasks must reference existing rotations
- Assignments must reference existing residents
- Reflections must reference existing residents
- Petitions must reference existing rotations

### 5. Input Validation

All user input is validated:

- String lengths enforced (prevent bloat)
- Numeric bounds checked (prevent overflow)
- Array sizes limited (prevent abuse)
- Enum values validated (prevent corruption)
- Date formats verified (prevent parsing errors)

### 6. Rate Limiting Considerations

**Current Implementation:**
The `hasThrottlePassed()` function provides basic time-based throttling.

**Limitations:**

- Only works for sequential operations on the same document
- Cannot enforce global rate limits across all documents
- Not suitable for preventing rapid bulk operations

**Recommended for Production:**

- Use Cloud Functions with Upstash Redis for global rate limiting
- Implement quota tracking in Firestore with scheduled cleanup
- Use Firebase App Check for client attestation
- Monitor Firebase quota usage in Cloud Console

### 7. Security Rule Limits

Be aware of Firestore security rule limitations:

**Document Reads:**

- Each `exists()` or `get()` call counts against quota
- Max 10 document reads per rule evaluation
- Cross-collection validation uses quota

**Performance:**

- Complex rules slow down operations
- Minimize nested function calls
- Cache repeated `get()` results when possible

**Testing:**

- Always test rules with Firebase emulator
- Use `@firebase/rules-unit-testing` for automated tests
- Test edge cases and boundary conditions

---

## Monitoring & Maintenance

### Monitoring Security Rule Denials

Check for denied operations in production:

```bash
# View recent Firestore logs
firebase firestore:logs --limit 100

# Filter for permission denied errors
firebase firestore:logs --limit 100 | grep "PERMISSION_DENIED"
```

### Regular Audits

Conduct quarterly security audits:

1. Review all collection rules
2. Check for new collections without rules
3. Verify immutability constraints
4. Test cross-collection validations
5. Update test suite for new features
6. Review Firebase Console metrics

### Rule Metrics to Monitor

- **Permission denied rate** - Spikes indicate attacks or bugs
- **Rule evaluation latency** - Slow rules impact UX
- **Document read quota** - Cross-collection validation cost
- **Failed operations** - Schema validation failures

---

## Troubleshooting

### Common Issues

#### 1. Permission Denied on Valid Operations

**Symptom:** User cannot perform legitimate action

**Diagnosis:**

- Check user's role and status in `/users/{uid}`
- Verify approval status (`active` or `approved`)
- Review immutability constraints
- Check cross-collection dependencies

**Fix:**

- Update user status to `active`
- Ensure referenced documents exist
- Review field-level permissions

#### 2. Schema Validation Failures

**Symptom:** Document creation/update fails despite correct data

**Diagnosis:**

- Check field types (string vs number vs timestamp)
- Verify required fields are present
- Check string length constraints
- Validate enum values

**Fix:**

- Update client code to match schema
- Add missing required fields
- Enforce validation before submission

#### 3. Cross-Collection Validation Failures

**Symptom:** Cannot create document referencing another collection

**Diagnosis:**

- Verify referenced document exists
- Check document ID format
- Review collection name spelling

**Fix:**

- Create referenced documents first
- Use correct document IDs
- Ensure proper operation order

#### 4. Immutability Violations

**Symptom:** Cannot update document field that should be mutable

**Diagnosis:**

- Check immutability rules for collection
- Verify field name spelling
- Review update payload

**Fix:**

- Remove immutable fields from update payload
- Use correct field names
- Check conditional immutability rules

---

## Future Enhancements

Potential improvements for future iterations:

### 1. Advanced Rate Limiting

- Implement Cloud Functions with Redis
- Add per-user quotas (e.g., 100 tasks/hour)
- Global rate limits for expensive operations

### 2. Content Validation

- Sanitize user input (XSS prevention)
- Profanity filtering
- Maximum content length enforcement
- File upload validation (size, type)

### 3. Audit Logging

- Log all admin actions to `auditLog` collection
- Track who approved/denied petitions
- Record permission changes
- Monitor suspicious activity patterns

### 4. Dynamic Role Permissions

- Store permissions in Firestore
- Allow runtime permission updates
- Support custom roles beyond resident/tutor/admin

### 5. Field-Level Encryption

- Encrypt sensitive fields at rest
- Use Cloud KMS for key management
- Implement client-side encryption for PII

### 6. Advanced Schema Validation

- Use Zod/Yup schemas in Cloud Functions
- Validate nested object structures
- Enforce regex patterns on strings
- Cross-field validations (e.g., startDate < endDate)

---

## Resources

- [Firestore Security Rules Documentation](https://firebase.google.com/docs/firestore/security/get-started)
- [Rules Unit Testing](https://firebase.google.com/docs/rules/unit-tests)
- [Security Best Practices](https://firebase.google.com/docs/rules/best-practices)
- [Common Security Patterns](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [Rate Limiting with Cloud Functions](https://firebase.google.com/docs/functions/rate-limiting)

---

## Support

For questions or issues with security rules:

1. Review this documentation
2. Check test suite for examples
3. Review Firebase Console logs
4. Consult Firestore security rules documentation
5. Open an issue in the project repository

---

**Last Updated:** 2025-11-17
**Version:** 2.0 (Enhanced Security Rules)
