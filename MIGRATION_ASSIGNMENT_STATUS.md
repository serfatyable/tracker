# Assignment Status Migration Guide

## Overview

This guide explains the critical architectural change to rotation status management and how to migrate your existing data.

## What Changed?

### Before (❌ Incorrect)

Rotation status was stored **globally** in the `rotations` collection:

```javascript
// rotations/{rotationId}
{
  name: "ICU",
  status: "active"  // ❌ Global for all residents
}
```

**Problem:** When Resident A activated ICU, it became "active" for everyone!

### After (✅ Correct)

Rotation status is now **per-resident** in the `assignments` collection:

```javascript
// assignments/{assignmentId}
{
  residentId: "resident1",
  rotationId: "icu",
  status: "active",  // ✅ Per-resident status
  startedAt: Timestamp,
  endedAt: null
}
```

**Benefit:** Each resident has independent progress through rotations!

## Why This Matters

- ✅ Multiple residents can work on the same rotation simultaneously
- ✅ Each resident has their own status: inactive, active, or finished
- ✅ Resident A's activation doesn't affect Resident B
- ✅ Prevents collision and confusion

## Migration Steps

### Step 1: Deploy Code Changes

The code changes have already been committed. You need to:

1. **Pull the latest changes:**

   ```bash
   git pull origin main
   ```

2. **Deploy Firestore indexes:**

   ```bash
   firebase deploy --only firestore:indexes
   ```

3. **Deploy security rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

### Step 2: Run Data Migration

⚠️ **REQUIRED if you have existing assignments in your database!**

#### 2a. Test with Dry Run

First, preview what will change:

```bash
node scripts/migrate-assignment-status.js --dry-run
```

Review the output to ensure it looks correct.

#### 2b. Run Migration

Apply the changes:

```bash
node scripts/migrate-assignment-status.js
```

### Step 3: Verify

1. Open Firestore console
2. Check `assignments` collection
3. Verify all assignments now have a `status` field:
   - `'active'` if `endedAt` was `null`
   - `'finished'` if `endedAt` was set

## Expected Migration Output

```
🔄 Assignment Status Migration Script

🔍 Fetching all assignments...
📊 Found 15 assignment(s)

✏️  [abc123] resident=resident1, rotation=icu
    → Setting status: active (endedAt: null)
✏️  [def456] resident=resident2, rotation=or
    → Setting status: finished (endedAt: set)

============================================================
📊 Migration Summary:
============================================================
Total assignments:        15
Migrated:                 15
Skipped (already had status): 0
Errors:                   0
============================================================

✅ Migration complete!
```

## New Flow

### Admin assigns resident to rotation:

- Assignment created with `status: 'inactive'`

### Resident petitions to activate:

- Petition submitted
- Validation: prevents multiple active rotations

### Admin approves petition:

- Assignment `status` changes to `'active'`
- Resident can now work on tasks

### Resident petitions to finish:

- Petition submitted

### Admin approves finish:

- Assignment `status` changes to `'finished'`
- `endedAt` timestamp is set

## Troubleshooting

### "Cannot find module 'firebase-admin'"

```bash
npm install firebase-admin
```

### "Service account key not found"

Ensure `firebase-service-account.json` exists in project root, or set:

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

### "Permission denied"

Ensure your service account has Firestore write permissions

### Migration script shows errors

- Check Firestore console for the specific assignment IDs
- Ensure your Firebase credentials are correct
- Run with `--dry-run` first to diagnose issues

## Rollback (Emergency Only)

If you need to rollback:

1. **Revert code changes:**

   ```bash
   git revert <commit-hash>
   ```

2. **Redeploy rules and indexes:**

   ```bash
   firebase deploy --only firestore:rules,firestore:indexes
   ```

3. **Note:** You may need to manually remove `status` fields from assignments

## Questions?

If you encounter issues:

1. Check the migration script output for specific errors
2. Verify Firebase credentials are correct
3. Ensure Firestore indexes have been deployed
4. Review the updated security rules

For more details, see:

- `scripts/README.md` - Migration script documentation
- `types/assignments.ts` - Updated Assignment type
- `lib/firebase/admin.ts` - Petition approval logic
