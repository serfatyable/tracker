#!/usr/bin/env node
/* eslint-disable */

/**
 * Update a user's Hebrew name (fullNameHe) in Firestore
 * Usage: node scripts/update-user-hebrew-name.js daniel.serfaty@example.com "דניאל צרפתי"
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Parse command line arguments
const args = process.argv.slice(2);
const email = args[0];
const hebrewName = args[1];
const dryRun = args.includes('--dry-run') || args.includes('-d');

if (!email || !hebrewName) {
  console.error(
    'Usage: node scripts/update-user-hebrew-name.js <email> "<hebrew_name>" [--dry-run]',
  );
  process.exit(1);
}

// Load Firebase credentials
let credentials;
const keyPath = path.join(__dirname, '..', 'firebase-service-account.json');
if (fs.existsSync(keyPath)) {
  credentials = require(keyPath);
} else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  console.error('Error: Firebase service account credentials not found.');
  console.error('Either create firebase-service-account.json in project root');
  console.error('Or set FIREBASE_SERVICE_ACCOUNT environment variable');
  process.exit(1);
}

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(credentials),
});

const db = admin.firestore();

async function updateUserHebrewName() {
  try {
    console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Updating Hebrew name for user: ${email}`);
    console.log(`Hebrew name: ${hebrewName}\n`);

    // Find user by email
    const usersSnapshot = await db.collection('users').where('email', '==', email).get();

    if (usersSnapshot.empty) {
      console.error(`❌ User with email "${email}" not found`);
      process.exit(1);
    }

    if (usersSnapshot.size > 1) {
      console.error(`⚠️  Warning: Multiple users with email "${email}" found`);
    }

    let updated = 0;
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const uid = doc.id;

      console.log(`Found user: ${userData.fullName || 'No name'} (UID: ${uid})`);
      console.log(`Current fullNameHe: ${userData.fullNameHe || '(not set)'}`);

      if (!dryRun) {
        await doc.ref.update({ fullNameHe: hebrewName });
        updated++;
        console.log(`✅ Updated fullNameHe to: ${hebrewName}`);
      } else {
        console.log(`[DRY RUN] Would update fullNameHe to: ${hebrewName}`);
      }
    }

    console.log(`\n${dryRun ? '[DRY RUN] Would update' : 'Updated'} ${updated} user(s)`);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

updateUserHebrewName();
