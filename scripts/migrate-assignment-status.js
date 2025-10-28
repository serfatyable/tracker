#!/usr/bin/env node
/**
 * Assignment Status Migration Script
 *
 * This script migrates existing assignments to include the new 'status' field.
 *
 * Migration Logic:
 * - If endedAt is null → status = 'active' (resident is currently working on it)
 * - If endedAt is set → status = 'finished' (resident completed it)
 *
 * Usage:
 *   node scripts/migrate-assignment-status.js [--dry-run]
 *
 * Options:
 *   --dry-run    Preview changes without actually updating the database
 */
/* eslint-env node */
/* global require, process, __dirname, console */
const fs = require('fs');
const path = require('path');

const admin = require('firebase-admin');

// Initialize Firebase Admin (supports .env.local and individual vars)
try {
  const envPath = path.join(__dirname, '../.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) return;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  }
} catch {
  // ignore
}

let credentialData;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    credentialData = parsed;
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT JSON.');
    throw e;
  }
} else if (
  process.env.FIREBASE_PRIVATE_KEY &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT)
) {
  credentialData = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  };
} else {
  credentialData = require('../firebase-service-account.json');
}

admin.initializeApp({
  credential: admin.credential.cert(credentialData),
});

const db = admin.firestore();

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

console.log('🔄 Assignment Status Migration Script\n');
if (isDryRun) {
  console.log('⚠️  DRY RUN MODE - No changes will be made to the database\n');
}

async function migrateAssignments() {
  console.log('🔍 Fetching all assignments...');
  const snapshot = await db.collection('assignments').get();

  if (snapshot.empty) {
    console.log('✅ No assignments found. Nothing to migrate.');
    return { total: 0, migrated: 0, skipped: 0, errors: 0 };
  }

  console.log(`📊 Found ${snapshot.size} assignment(s)\n`);

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const batch = db.batch();
  let batchCount = 0;
  const MAX_BATCH_SIZE = 500; // Firestore batch limit

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const assignmentId = doc.id;

    // Skip if already has status field
    if (data.status) {
      console.log(`⏭️  [${assignmentId}] Already has status: ${data.status}`);
      skipped++;
      continue;
    }

    // Determine status based on endedAt
    let newStatus;
    if (data.endedAt === null || data.endedAt === undefined) {
      newStatus = 'active';
    } else {
      newStatus = 'finished';
    }

    // Log the change
    console.log(`✏️  [${assignmentId}] resident=${data.residentId}, rotation=${data.rotationId}`);
    console.log(`    → Setting status: ${newStatus} (endedAt: ${data.endedAt ? 'set' : 'null'})`);

    if (!isDryRun) {
      try {
        batch.update(doc.ref, { status: newStatus });
        batchCount++;

        // Commit batch if we hit the limit
        if (batchCount >= MAX_BATCH_SIZE) {
          await batch.commit();
          console.log(`    ✅ Committed batch of ${batchCount} updates`);
          batchCount = 0;
        }

        migrated++;
      } catch (error) {
        console.error(`    ❌ Error updating assignment ${assignmentId}:`, error.message);
        errors++;
      }
    } else {
      migrated++;
    }
  }

  // Commit remaining batch
  if (!isDryRun && batchCount > 0) {
    await batch.commit();
    console.log(`✅ Committed final batch of ${batchCount} update(s)`);
  }

  return { total: snapshot.size, migrated, skipped, errors };
}

async function run() {
  try {
    const stats = await migrateAssignments();

    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`Total assignments:        ${stats.total}`);
    console.log(`Migrated:                 ${stats.migrated}`);
    console.log(`Skipped (already had status): ${stats.skipped}`);
    console.log(`Errors:                   ${stats.errors}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n⚠️  This was a DRY RUN. No changes were made.');
      console.log('💡 Run without --dry-run to apply changes:');
      console.log('   node scripts/migrate-assignment-status.js');
    } else {
      console.log('\n✅ Migration complete!');
    }

    process.exit(stats.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

run();
