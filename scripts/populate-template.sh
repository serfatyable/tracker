#!/bin/bash

################################################################################
# Populate Production Template with All Credentials
#
# This script creates .env.production.secure.template with all known values
# filled in. You still need to add Upstash/Sentry if you want them.
################################################################################

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="$PROJECT_ROOT/.env.production.secure.template"

if [ -f "$TEMPLATE_FILE" ]; then
  echo "⚠️  Template file already exists: $TEMPLATE_FILE"
  read -p "Overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 1
  fi
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
# Firebase Web App Configuration (from Firebase Console)

FIREBASE_PROD_PROJECT_ID=tracker-prod-286876
FIREBASE_PROD_API_KEY=AIzaSyCP5PxPWL-R8HlAe_wEgxmj1MLeX8iQTz8
FIREBASE_PROD_AUTH_DOMAIN=tracker-prod-286876.firebaseapp.com
FIREBASE_PROD_STORAGE_BUCKET=tracker-prod-286876.firebasestorage.app
FIREBASE_PROD_APP_ID=1:482502738942:web:4a026778f70252eaf0f6af

# Firebase Admin SDK (from Service Account JSON)
FIREBASE_PROD_ADMIN_PROJECT_ID=tracker-prod-286876
FIREBASE_PROD_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@tracker-prod-286876.iam.gserviceaccount.com
FIREBASE_PROD_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfiryKMZYP9XZw\nydVitqaMxzLyjsiSUSohFzNAZQLnEwhygEoscUXvr69SlMyEgor4GbG80RWSp2+O\nvztfa+WOGhTDl4pktg8kSdX6mLx8x9XfRJYOWBJmKsPCO6cGwFdIaAelYL7LTrLK\nn3tbyPsg9eZGlwXrMhlxccP+LgTMFuOjMlqpr7sJTS3HlEUVNSrr42DFMQDlUnp0\nSRlkt0ClSOBHqnhfQLiDOQFw4dwn93WAgVIkdtrUBmbAB79zHLPxwNwXqxn+aZcK\nTxn/9MKYsiVSHvrkMF6VBV0VyD/h9QIlEJ7CKxR1q8X41aZURyFGeZ6igoymxLLD\nME78rHSjAgMBAAECggEANCmkvlw7D6m2WWcsTPOiHcotZq/3dRtzdlFDEQ1Vtx56\ndxFp7wD0GEttO8dp3PNfo4GnIrCL6KC08UumCmtZKS5u1opwFcCOz9MSUrZofjXK\nQA8JLtRt45ic258sW6E8iHB2+4PXrdpjy6r8JsTeEudDLJZJOZ5uQjCrn6oFKILZ\nEIDkzRAnkMXT+cbOXqEEPw4wpn2cHeZIFdCOf+cBeCsfznOG8Ch1pLSNFjBS2GRk\nWGVYFN99ms5IXYGDnKO8hfqI9whGLkzmSLZ8ts3YnrkrOoRn8HyK05pURYwDlkpq\nJqiAHm3w5d8zwtKDwpPzUwbUDCWadfKtPpVptxi4eQKBgQDTDtIXpqUZIyTdyx4S\n07BjegWWYrULmoByuodX2Thahma6Vaec/3/a7i2eV3l3VmtMiAfHkWbcMROpYcka\n0cUxnLmd0dqa4oJH/wlGhuV5IsD2/CJdCyeyThBSDH83b4OpAGEKLhfaLljhGiql\nFqjPhMSKNxAcNiKmtI9fs5lGqQKBgQDBg64i6PwuQBqNXS7yckVVqgZ2asvgy++L\ny6Vs4ZBQRqYT4tuoxnD7iDLnuRP8ajBau8ZBRPlrq3Al6kq+h7LnWwsE7lb13rDX\nFhBZ2iwd2jTBW1BLti2Ob+kacyDvtmqtJk2LNmz+19xQ2tdxE/ModhLIAVwH5RNK\n/HqXpWwMawKBgQCwP4giR/9G5po6vQv4HN8HszZHR1Z4wiTRqgKr0bHFpsbShATc\njmBuqsddmx7MEVa5Kj+U4E9NQY5xvD78LoDF1WML79rlzJGPHeLZCn1Gk0cg+ZyY\npmAX/iiS2+zAllcUIkTnA2bXxCxkjj1eb3W5Fd4qraC+blaxb8bq3Ef7QQKBgCNt\nVg3yFWjqN3I14whjvynFrNU1DAoli79OEwTx7pejt3fgilJFsh16e8dMbMpDLoMN\n6We9luQNSMTINdLXyPruAgBvGeB9WmamFWw9suHsNshHTVXvDjwLZOOAvEDmZnU4\nk+2ukxm8rwrmZZbADj4UD7Ap/406dOO/gToOAM/tAoGAD6de4aii/cxSCqejPxzG\n/PzTwSKinhTh286Zj3VPEQRrXJNCTjYMpvlZQrp4Hr7rdmJXm2n50dIH7W6e4c71\naEKpekryKTqHzmZKExieUdW0z94eoeigWMjbvyki02SQeZIsBnT1rovxD18riuZI\n2db71YwYRkKk5ifvBA3a8Bw=\n-----END PRIVATE KEY-----\n"

# ============================================================================
# VERCEL PRODUCTION PROJECT CONFIGURATION
# ============================================================================
# Your production Vercel project name (from Vercel dashboard)
VERCEL_PROD_PROJECT=tracker-production

# Production URL (your custom domain or Vercel URL)
VERCEL_PROD_URL=https://tracker-production.vercel.app

# ============================================================================
# UPSTASH REDIS (Rate Limiting) - OPTIONAL BUT RECOMMENDED
# ============================================================================
# Sign up at: https://upstash.com
# Create a Redis database in europe-west1 region (matches Firestore)
# Get these from: Upstash Dashboard → Your Database → REST API

UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token

# ============================================================================
# SENTRY (Error Tracking) - OPTIONAL BUT RECOMMENDED
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
# ✅ Firebase credentials are already filled in!
# ✅ Vercel project details are already filled in!
# 
# Optional (but recommended for production):
# - Set up Upstash Redis for rate limiting (see above)
# - Set up Sentry for error tracking (see above)
#
# After filling out optional services (or leaving them as-is), run:
#   ./scripts/setup-production.sh
#
# The script will:
#    - Validate all values are filled
#    - Set Vercel environment variables
#    - Configure Firebase CLI
#    - Deploy Firestore rules and indexes
#    - Verify configuration
EOF

echo "✅ Created production template with all Firebase and Vercel credentials!"
echo ""
echo "📋 File location: $TEMPLATE_FILE"
echo ""
echo "✅ Already filled in:"
echo "   - Firebase Web App config"
echo "   - Firebase Admin SDK credentials"
echo "   - Vercel project details"
echo ""
echo "⏭️  Optional (but recommended):"
echo "   - Upstash Redis (for rate limiting)"
echo "   - Sentry (for error tracking)"
echo ""
echo "🚀 Next steps:"
echo "   1. Review the template: $TEMPLATE_FILE"
echo "   2. Add Upstash/Sentry credentials if desired (or leave as-is)"
echo "   3. Run: ./scripts/setup-production.sh"
echo ""
echo "⚠️  Remember: This file is gitignored and contains secrets. Never commit it!"

