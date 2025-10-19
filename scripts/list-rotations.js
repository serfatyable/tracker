#!/usr/bin/env node
/**
 * List Current Rotations Script
 *
 * This script lists all rotations and rotation nodes to help create translations
 *
 * Usage:
 *   node scripts/list-rotations.js [--nodes] [--output translations-template.json]
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
const includeNodes = args.includes('--nodes');
const outputIndex = args.indexOf('--output');
const outputFile = outputIndex !== -1 ? args[outputIndex + 1] : null;
const includeUnchanged = args.includes('--include-unchanged');

console.log('📋 Listing Current Rotations\n');

async function listRotations() {
  console.log('🔍 Fetching rotations...');
  const snapshot = await db.collection('rotations').get();

  const rotations = {};
  const rotationsList = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    const name = data.name || doc.id;

    rotationsList.push({
      id: doc.id,
      name: name,
      name_en: data.name_en || null,
      name_he: data.name_he || null,
    });

    // Build template for translations.json
    if (!data.name_en || !data.name_he) {
      rotations[doc.id] = {
        name_en: data.name_en || name,
        name_he: data.name_he || `[TRANSLATE: ${name}]`,
      };
    }
  });

  console.log('\n📊 Found', rotationsList.length, 'rotations:\n');
  rotationsList.forEach((r) => {
    console.log(`  ${r.id}:`);
    console.log(`    Current: ${r.name}`);
    console.log(`    EN: ${r.name_en || '❌ MISSING'}`);
    console.log(`    HE: ${r.name_he || '❌ MISSING'}`);
    console.log('');
  });

  return rotations;
}

async function listNodes() {
  if (!includeNodes) return {};

  console.log('🔍 Fetching rotation nodes...');
  const snapshot = await db.collection('rotationNodes').get();

  const categories = new Set();
  const uniqueNames = new Set();
  const common = {};
  const nodesMap = {};

  const isLikelyEnglish = (s) => {
    if (!s || typeof s !== 'string') return false;
    // Heuristic: only printable ASCII characters → likely English
    return /^[\x20-\x7E]+$/.test(s);
  };

  snapshot.forEach((doc) => {
    const data = doc.data();
    const name = data.name;
    nodesMap[doc.id] = {
      name: name || '',
      name_en: data.name_en || null,
      name_he: data.name_he || null,
      type: data.type || null,
    };

    if (data.type === 'category') {
      categories.add(name);
    }

    if (name && !data.name_he) {
      uniqueNames.add(name);
    }
  });

  console.log('\n📊 Found', snapshot.size, 'rotation nodes');
  console.log('\n📂 Categories found:');
  categories.forEach((cat) => {
    console.log(`  - ${cat}`);
  });

  console.log(`\n📝 ${uniqueNames.size} unique names need translation`);
  console.log('\nTop 20 most common:');
  Array.from(uniqueNames)
    .slice(0, 20)
    .forEach((name) => {
      console.log(`  - ${name}`);
      common[name] = `[TRANSLATE: ${name}]`;
    });

  // Build nodes needing attention: missing Hebrew OR Hebrew likely still English
  const nodesNeedingHebrew = {};
  Object.entries(nodesMap).forEach(([id, info]) => {
    const needs =
      !info.name_he ||
      (includeUnchanged &&
        (info.name_he === info.name_en ||
          info.name_he === info.name ||
          isLikelyEnglish(info.name_he)));
    if (needs) {
      nodesNeedingHebrew[id] = `[TRANSLATE: ${info.name || id}]`;
    }
  });

  return { categories, common, nodesMap, nodesNeedingHebrew };
}

async function run() {
  try {
    const rotations = await listRotations();
    const { categories, common, nodesNeedingHebrew } = await listNodes();

    if (outputFile) {
      const nodes = nodesNeedingHebrew || {};

      const template = {
        rotations,
        nodes,
        categories: {},
        common: common || {},
      };

      // Add category translations if found
      if (categories) {
        categories.forEach((cat) => {
          template.categories[cat] = `[TRANSLATE: ${cat}]`;
        });
      }

      const outputPath = path.join(__dirname, outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(template, null, 2));
      console.log(`\n✅ Template saved to: ${outputPath}`);
      console.log('\nNext steps:');
      console.log('1. Open the template file');
      console.log('2. Replace [TRANSLATE: ...] with actual Hebrew translations');
      console.log('3. Save as translations.json');
      console.log('4. Run: node scripts/add-hebrew-translations.js --dry-run');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error);
    process.exit(1);
  }
}

run();
