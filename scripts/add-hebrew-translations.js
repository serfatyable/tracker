#!/usr/bin/env node
/**
 * Migration Script: Add Hebrew Translations to Firestore
 * 
 * This script adds name_en and name_he fields to rotations and rotationNodes
 * 
 * Usage:
 *   node scripts/add-hebrew-translations.js [--dry-run] [--backup]
 * 
 * Options:
 *   --dry-run   Show what would be updated without making changes
 *   --backup    Create backup JSON files before updating
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load translations
const translations = require('./translations.json');

// Initialize Firebase Admin
// 1) Try to load env from .env.local if present (no extra deps)
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = value;
      }
    });
  }
} catch {
  // best-effort; ignore
}

// 2) Accept one of the following credential sources, in order:
//    a) FIREBASE_SERVICE_ACCOUNT (JSON string)
//    b) Individual vars: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
//    c) Fallback file: ../firebase-service-account.json
let credentialData;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    const parsed = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    credentialData = parsed;
  } catch (e) {
    console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT env var as JSON.');
    throw e;
  }
} else if (
  (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL && (process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT))
)
{
  credentialData = {
    projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  };
} else {
  credentialData = require('../firebase-service-account.json');
}

admin.initializeApp({
  credential: admin.credential.cert(credentialData)
});

const db = admin.firestore();

// Parse command line args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const shouldBackup = args.includes('--backup');
const overwriteNames = args.includes('--overwrite-names');
const overwriteLinks = args.includes('--overwrite-links');

console.log('🚀 Starting Hebrew Translation Migration');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (no changes will be made)' : '✏️  LIVE UPDATE'}`);
console.log(`Backup: ${shouldBackup ? 'YES' : 'NO'}\n`);
if (overwriteNames) console.log('↻ Overwrite Names: YES');
if (overwriteLinks) console.log('↻ Overwrite Links: YES');

async function backupCollection(collectionName) {
  console.log(`📦 Backing up ${collectionName}...`);
  const snapshot = await db.collection(collectionName).get();
  const data = {};
  
  snapshot.forEach(doc => {
    data[doc.id] = doc.data();
  });
  
  const backupDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = path.join(backupDir, `${collectionName}_${timestamp}.json`);
  
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));
  console.log(`✅ Backup saved: ${filename}\n`);
  
  return data;
}

function getTranslation(type, key, fallback) {
  // Try to find translation in our mapping
  if (translations[type] && translations[type][key]) {
    return translations[type][key];
  }
  
  // Try common translations
  if (translations.common && translations.common[key]) {
    return translations.common[key];
  }
  
  // Try category translations
  if (translations.categories && translations.categories[key]) {
    return translations.categories[key];
  }
  
  return fallback;
}

async function migrateRotations() {
  console.log('🔄 Processing rotations collection...');
  
  const snapshot = await db.collection('rotations').get();
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  
  const batch = db.batch();
  
  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    const currentName = data.name;
    
    // Skip if already has both name_en and name_he
    if (data.name_en && data.name_he) {
      skipped++;
      console.log(`  ⏭️  ${doc.id}: Already has translations`);
      continue;
    }
    
    // Get translations
    const nameEn = data.name_en || currentName || doc.id;
    const nameHe = data.name_he || getTranslation('rotations', doc.id, currentName);
    
    console.log(`  📝 ${doc.id}:`);
    console.log(`     EN: ${nameEn}`);
    console.log(`     HE: ${nameHe}`);
    
    if (!isDryRun) {
      batch.update(doc.ref, {
        name_en: nameEn,
        name_he: nameHe,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      updated++;
    }
  }
  
  if (!isDryRun && updated > 0) {
    await batch.commit();
    console.log(`\n✅ Updated ${updated} rotations`);
  }
  
  console.log(`📊 Rotations: ${processed} total, ${updated} updated, ${skipped} skipped\n`);
}

async function migrateRotationNodes() {
  console.log('🔄 Processing rotationNodes collection...');
  
  const snapshot = await db.collection('rotationNodes').get();
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;
  
  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    const currentName = data.name;
    
    // Skip if already has both name_en and name_he, unless overwriting
    if (!overwriteNames && data.name_en && data.name_he) {
      skipped++;
      continue;
    }
    
    // Get translations
    const nameEn = data.name_en || currentName || doc.id;
    let nameHe;
    
    // If overwriting, always get translation from file first
    if (overwriteNames) {
      nameHe = getTranslation('nodes', doc.id, null);
      if (!nameHe) {
        nameHe = getTranslation('common', currentName, null);
      }
      // If still no translation found, fall back to existing or English
      if (!nameHe) {
        nameHe = data.name_he || currentName;
      }
    } else {
      // If not overwriting, use existing or get translation
      nameHe = data.name_he || getTranslation('nodes', doc.id, null);
      if (!nameHe) {
        nameHe = getTranslation('common', currentName, currentName);
      }
    }
    
    if (processed % 50 === 0) {
      console.log(`  📊 Processed ${processed} nodes...`);
    }
    
    // Only write if overwriting or values are missing/different
    const shouldWrite =
      overwriteNames || !data.name_he || !data.name_en || data.name_he !== nameHe || data.name_en !== nameEn;
    if (shouldWrite) {
      if (!isDryRun) {
        currentBatch.update(doc.ref, {
          name_en: nameEn,
          name_he: nameHe,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        batchCount++;
        updated++;
        
        // Firestore batch limit is 500
        if (batchCount >= 450) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          batchCount = 0;
        }
      } else {
        // In dry-run, still count what WOULD be updated
        updated++;
      }
    }
  }
  
  if (!isDryRun && updated > 0) {
    // Add last batch
    if (batchCount > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches
    console.log(`\n📤 Committing ${batches.length} batches...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`  ✅ Batch ${i + 1}/${batches.length} committed`);
    }
    console.log(`\n✅ Updated ${updated} rotation nodes`);
  }
  
  console.log(`📊 Rotation Nodes: ${processed} total, ${updated} updated, ${skipped} skipped\n`);
}

async function migrateLinkLabels() {
  console.log('🔄 Populating Hebrew link labels where possible...');
  const snapshot = await db.collection('rotationNodes').get();
  let processed = 0;
  let updated = 0;
  let batches = [];
  let currentBatch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    processed++;
    const data = doc.data();
    const links = Array.isArray(data.links) ? data.links : [];
    if (!Array.isArray(links) || links.length === 0) continue;

    let changed = false;
    const nextLinks = links.map((lnk) => {
      if (!lnk) return lnk;
      const labelEn = lnk.label_en || lnk.label || null;
      let labelHe = lnk.label_he || null;
      if (!labelHe && labelEn && typeof labelEn === 'string') {
        const tr = getTranslation('common', labelEn, null);
        if (tr && tr !== labelEn) {
          labelHe = tr;
          changed = true;
          return { ...lnk, label_en: labelEn, label_he: labelHe };
        }
      }
      return lnk;
    });

    if (changed || overwriteLinks) {
      if (!isDryRun) {
        const finalLinks = overwriteLinks ? nextLinks.map((lnk) => {
          if (!lnk) return lnk;
          const labelEn = lnk.label_en || lnk.label || null;
          let labelHe = lnk.label_he || null;
          if (labelEn && (!labelHe || overwriteLinks)) {
            const tr = getTranslation('common', labelEn, labelHe || labelEn);
            labelHe = tr;
            return { ...lnk, label_en: labelEn, label_he: labelHe };
          }
          return lnk;
        }) : nextLinks;
        currentBatch.update(doc.ref, {
          links: finalLinks,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        batchCount++;
        updated++;
        if (batchCount >= 450) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          batchCount = 0;
        }
      } else {
        // In dry-run, still count what WOULD be updated
        updated++;
      }
    }
  }

  if (!isDryRun && updated > 0) {
    if (batchCount > 0) batches.push(currentBatch);
    console.log(`\n📤 Committing ${batches.length} batches (link labels)...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      console.log(`  ✅ Batch ${i + 1}/${batches.length} committed`);
    }
  }

  console.log(`📊 Link Labels: ${processed} nodes scanned, ${updated} updated\n`);
}

async function run() {
  try {
    // Backup if requested
    if (shouldBackup && !isDryRun) {
      await backupCollection('rotations');
      await backupCollection('rotationNodes');
    }
    
    // Migrate collections
    await migrateRotations();
    await migrateRotationNodes();
    await migrateLinkLabels();
    
    if (isDryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - No changes were made');
      console.log('Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ MIGRATION COMPLETE!');
      console.log('\nNext steps:');
      console.log('1. Test the app in Hebrew mode');
      console.log('2. Verify rotation names appear in Hebrew');
      console.log('3. Update any missing translations in translations.json');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

run();

