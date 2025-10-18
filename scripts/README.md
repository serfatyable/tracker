# Hebrew Translation Migration Scripts

This directory contains scripts to add Hebrew translations to your Firestore database.

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

