#!/bin/bash

################################################################################
# Create Secure Configuration Template
#
# This script creates .env.production.secure.template for you to fill out.
# This file is gitignored and contains placeholders for all production secrets.
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="$PROJECT_ROOT/.env.production.secure.template"

if [ -f "$TEMPLATE_FILE" ]; then
  echo "⚠️  Template file already exists: $TEMPLATE_FILE"
  echo "Delete it first if you want to recreate it."
  exit 1
fi

cat > "$TEMPLATE_FILE" << 'EOF'
# ⚠️ SECURE CONFIGURATION TEMPLATE
# 
# This file is GITIGNORED - fill it out locally and NEVER commit it.
# Use this to collect all your production credentials before running setup scripts.
#
# After filling this out, run:
#   ./scripts/setup-production.sh
#
# This will securely configure Vercel and Firebase for production.

# ============================================================================
# FIREBASE PRODUCTION PROJECT CONFIGURATION
# ============================================================================
# Get these from: Firebase Console → Project Settings → General → Your apps
# Select your PRODUCTION Firebase project (not staging!)

FIREBASE_PROD_PROJECT_ID=tracker-prod-286876
FIREBASE_PROD_API_KEY=your-production-api-key
FIREBASE_PROD_AUTH_DOMAIN=your-production-project.firebaseapp.com
FIREBASE_PROD_STORAGE_BUCKET=your-production-project.firebasestorage.app
FIREBASE_PROD_APP_ID=1:123456789:web:abcdef

# Firebase Admin SDK (from Service Account JSON)
# Get from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
# Download the JSON file and extract these values:
FIREBASE_PROD_ADMIN_PROJECT_ID=your-production-project-id
FIREBASE_PROD_ADMIN_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-production-project.iam.gserviceaccount.com
FIREBASE_PROD_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"

# ============================================================================
# VERCEL PRODUCTION PROJECT CONFIGURATION
# ============================================================================
# Your production Vercel project name (from Vercel dashboard)
VERCEL_PROD_PROJECT=tracker-production

# Production URL (your custom domain or Vercel URL)
# Example: https://tracker.yourdomain.com or https://tracker-production.vercel.app
VERCEL_PROD_URL=https://tracker-production.vercel.app

# ============================================================================
# UPSTASH REDIS (Rate Limiting)
# ============================================================================
# Sign up at: https://upstash.com
# Create a Redis database in europe-west1 region (matches Firestore)
# Get these from: Upstash Dashboard → Your Database → REST API

UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# ============================================================================
# SENTRY (Error Tracking)
# ============================================================================
# Sign up at: https://sentry.io
# Create a project for Next.js
# Get DSN from: Sentry → Settings → Projects → Your Project → Client Keys (DSN)

SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321

# Optional: Auth token for uploading source maps
# Get from: Sentry → Settings → Auth Tokens → Create New Token
# Scopes needed: project:releases, project:write
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# ============================================================================
# OPTIONAL: Analytics & Monitoring
# ============================================================================

# Vercel Analytics (built-in, no config needed)
# Just enable in Vercel dashboard → Settings → Analytics

# Optional: Plausible Analytics
# PLAUSIBLE_DOMAIN=tracker.yourdomain.com
# PLAUSIBLE_API_KEY=your-plausible-api-key

# ============================================================================
# INSTRUCTIONS
# ============================================================================
# 1. Fill out all values above (remove "your-*" placeholders)
# 2. Save this file (it's already gitignored)
# 3. Run: ./scripts/setup-production.sh
# 4. The script will:
#    - Validate all values are filled
#    - Set Vercel environment variables
#    - Configure Firebase CLI
#    - Deploy Firestore rules and indexes
#    - Verify configuration
# 5. After setup, you can delete this file (or keep it as backup, it's gitignored)
EOF

echo "✅ Created secure configuration template: $TEMPLATE_FILE"
echo ""
echo "Next steps:"
echo "  1. Fill out all values in: $TEMPLATE_FILE"
echo "  2. Run: ./scripts/setup-production.sh"
echo ""
echo "⚠️  Remember: This file is gitignored and contains secrets. Never commit it!"

