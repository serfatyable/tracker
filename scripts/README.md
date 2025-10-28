# Tracker Database Migration Scripts

This directory contains scripts for database migrations and maintenance tasks.

## Available Scripts

### 1. Hebrew Translation Migration (`add-hebrew-translations.js`)

Adds Hebrew translations to rotations and rotation nodes.

### 2. Assignment Status Migration (`migrate-assignment-status.js`)

**⚠️ REQUIRED after upgrading to per-resident rotation status architecture**

Migrates existing assignments to include the new `status` field.

---

## Assignment Status Migration

### When to Run This Script

Run this script **once** after deploying the per-resident rotation status update if you have existing assignments in your database.

### What It Does

This script adds the `status` field to all existing assignments:

- If `endedAt` is `null` → sets `status` to `'active'` (resident is currently working on it)
- If `endedAt` is set → sets `status` to `'finished'` (resident completed it)

### Usage

#### 1. Dry Run (Recommended First)

Preview what changes will be made without modifying the database:

```bash
node scripts/migrate-assignment-status.js --dry-run
```

This will show you:

- How many assignments will be updated
- What status each assignment will receive
- Which assignments already have a status (will be skipped)

#### 2. Run the Migration

After reviewing the dry run output, apply the changes:

```bash
node scripts/migrate-assignment-status.js
```

### Example Output

```
🔄 Assignment Status Migration Script

🔍 Fetching all assignments...
📊 Found 15 assignment(s)

⏭️  [abc123] Already has status: active
✏️  [def456] resident=user1, rotation=icu
    → Setting status: active (endedAt: null)
✏️  [ghi789] resident=user2, rotation=or
    → Setting status: finished (endedAt: set)
✅ Committed final batch of 2 update(s)

============================================================
📊 Migration Summary:
============================================================
Total assignments:        15
Migrated:                 12
Skipped (already had status): 3
Errors:                   0
============================================================

✅ Migration complete!
```

### Troubleshooting

**"Service account key not found"**

- Ensure `firebase-service-account.json` exists in project root
- Or set environment variable: `FIREBASE_SERVICE_ACCOUNT`

**"Permission denied"**

- Ensure your service account has Firestore write permissions

### After Migration

1. Verify assignments in Firestore console have the `status` field
2. Test the resident rotation activation flow
3. Ensure residents can see their active rotations

---

## Hebrew Translation Migration

## Prerequisites

1. **Node.js** installed (v18 or later)
2. **Firebase Admin SDK** credentials
3. **Translations file** populated with your rotation names

## Setup

### 1. Install Dependencies

```bash
cd scripts
npm init -y
npm install firebase-admin
```

### 2. Get Firebase Service Account Key

1. Go to Firebase Console
2. Project Settings → Service Accounts
3. Click "Generate new private key"
4. Save as `firebase-service-account.json` in project root
5. **IMPORTANT:** This file is already in `.gitignore` - never commit it!

### 3. Update translations.json

Edit `scripts/translations.json` and add your rotation names:

```json
{
  "rotations": {
    "your_rotation_id": {
      "name_en": "English Name",
      "name_he": "שם בעברית"
    }
  }
}
```

## Usage

### Dry Run (Recommended First)

Test what would be changed without making any updates:

```bash
node scripts/add-hebrew-translations.js --dry-run
```

### With Backup

Create backup JSON files before updating:

```bash
node scripts/add-hebrew-translations.js --backup
```

### Live Update

**⚠️ WARNING: This will modify your database!**

```bash
node scripts/add-hebrew-translations.js
```

### Combined (Recommended)

Dry run first, then backup and update:

```bash
# 1. Check what would change
node scripts/add-hebrew-translations.js --dry-run

# 2. If looks good, create backup and update
node scripts/add-hebrew-translations.js --backup
```

## What the Script Does

1. **Reads** all documents from `rotations` and `rotationNodes` collections
2. **Checks** if documents already have `name_en` and `name_he` fields
3. **Adds** missing fields based on translations.json
4. **Updates** documents in Firestore
5. **Creates** timestamped backups (if --backup flag used)

## Backups

Backups are stored in `backups/` directory with timestamps:

- `backups/rotations_2025-10-18T10-30-00.json`
- `backups/rotationNodes_2025-10-18T10-30-00.json`

## Troubleshooting

### "Cannot find module 'firebase-admin'"

```bash
cd scripts
npm install firebase-admin
```

### "Service account key not found"

Make sure `firebase-service-account.json` exists in project root, or set:

```bash
export FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'
```

### "Permission denied"

Ensure your service account has Firestore write permissions

## After Migration

1. Test the app in Hebrew mode
2. Verify rotation names appear in Hebrew
3. Check rotation nodes display correctly
4. Update any missing translations in `translations.json`
5. Re-run script for items that still need translation

## Rollback

If something goes wrong, restore from backup:

```bash
node scripts/restore-from-backup.js backups/rotations_TIMESTAMP.json
```

(Restore script to be created if needed)
