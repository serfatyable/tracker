#!/bin/bash

################################################################################
# Production Setup Script
#
# This script securely configures Vercel and Firebase for production deployment.
# It reads from .env.production.secure.template (which you fill out locally).
#
# REQUIREMENTS:
#   - Vercel CLI installed and authenticated: `npm i -g vercel && vercel login`
#   - Firebase CLI installed and authenticated: `npm i -g firebase-tools && firebase login`
#   - Fill out .env.production.secure.template with your production credentials
#
# USAGE:
#   ./scripts/setup-production.sh
#
# SECURITY:
#   - All credentials are read from local .env.production.secure.template
#   - This file is gitignored and never committed
#   - Credentials are only sent to Vercel/Firebase APIs (never logged)
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
TEMPLATE_FILE="$PROJECT_ROOT/.env.production.secure.template"

# Function to print colored messages
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo -e "\n${BLUE}[STEP]${NC} $1"
}

# Check if template file exists
if [ ! -f "$TEMPLATE_FILE" ]; then
  log_error "Configuration template not found: $TEMPLATE_FILE"
  log_info "Please create .env.production.secure.template and fill it out with your production credentials."
  log_info "See PRODUCTION_SETUP_GUIDE.md for detailed instructions."
  exit 1
fi

# Load template file (source it to get variables)
log_step "Loading configuration from template..."
source "$TEMPLATE_FILE" || {
  log_error "Failed to load configuration template"
  exit 1
}

# Validate required variables
log_step "Validating configuration..."

REQUIRED_VARS=(
  "FIREBASE_PROD_PROJECT_ID"
  "FIREBASE_PROD_API_KEY"
  "FIREBASE_PROD_AUTH_DOMAIN"
  "FIREBASE_PROD_STORAGE_BUCKET"
  "FIREBASE_PROD_APP_ID"
  "FIREBASE_PROD_ADMIN_PROJECT_ID"
  "FIREBASE_PROD_ADMIN_CLIENT_EMAIL"
  "FIREBASE_PROD_ADMIN_PRIVATE_KEY"
  "VERCEL_PROD_PROJECT"
  "VERCEL_PROD_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ] || [[ "${!var}" == your-* ]]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  log_error "Missing or incomplete configuration variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  log_info "Please fill out all values in .env.production.secure.template"
  exit 1
fi

log_info "✅ All required variables are configured"

# Check CLI tools
log_step "Checking CLI tools..."

if ! command -v vercel &> /dev/null; then
  log_error "Vercel CLI not found. Install with: npm i -g vercel"
  exit 1
fi

if ! command -v firebase &> /dev/null; then
  log_error "Firebase CLI not found. Install with: npm i -g firebase-tools"
  exit 1
fi

# Verify authentication
log_step "Verifying authentication..."

if ! vercel whoami &> /dev/null; then
  log_error "Not authenticated with Vercel. Run: vercel login"
  exit 1
fi

if ! firebase projects:list &> /dev/null; then
  log_error "Not authenticated with Firebase. Run: firebase login"
  exit 1
fi

log_info "✅ CLI tools authenticated"

# Configure Vercel environment variables
log_step "Configuring Vercel environment variables..."

cd "$PROJECT_ROOT"

# Set Firebase client config (public)
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production <<< "$FIREBASE_PROD_API_KEY" || log_warn "Failed to set NEXT_PUBLIC_FIREBASE_API_KEY (may already exist)"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production <<< "$FIREBASE_PROD_AUTH_DOMAIN" || log_warn "Failed to set NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN (may already exist)"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production <<< "$FIREBASE_PROD_PROJECT_ID" || log_warn "Failed to set NEXT_PUBLIC_FIREBASE_PROJECT_ID (may already exist)"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production <<< "$FIREBASE_PROD_STORAGE_BUCKET" || log_warn "Failed to set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (may already exist)"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production <<< "$FIREBASE_PROD_APP_ID" || log_warn "Failed to set NEXT_PUBLIC_FIREBASE_APP_ID (may already exist)"

# Set Firebase admin config (secret)
vercel env add FIREBASE_PROJECT_ID production <<< "$FIREBASE_PROD_ADMIN_PROJECT_ID" || log_warn "Failed to set FIREBASE_PROJECT_ID (may already exist)"
vercel env add FIREBASE_CLIENT_EMAIL production <<< "$FIREBASE_PROD_ADMIN_CLIENT_EMAIL" || log_warn "Failed to set FIREBASE_CLIENT_EMAIL (may already exist)"
vercel env add FIREBASE_PRIVATE_KEY production <<< "$FIREBASE_PROD_ADMIN_PRIVATE_KEY" || log_warn "Failed to set FIREBASE_PRIVATE_KEY (may already exist)"

# Set app URL
vercel env add NEXT_PUBLIC_APP_URL production <<< "$VERCEL_PROD_URL" || log_warn "Failed to set NEXT_PUBLIC_APP_URL (may already exist)"
vercel env add NEXT_PUBLIC_APP_ENV production <<< "production" || log_warn "Failed to set NEXT_PUBLIC_APP_ENV (may already exist)"

# Set optional variables if provided
if [ -n "${UPSTASH_REDIS_REST_URL:-}" ] && [[ "$UPSTASH_REDIS_REST_URL" != your-* ]]; then
  vercel env add UPSTASH_REDIS_REST_URL production <<< "$UPSTASH_REDIS_REST_URL" || log_warn "Failed to set UPSTASH_REDIS_REST_URL (may already exist)"
  vercel env add UPSTASH_REDIS_REST_TOKEN production <<< "$UPSTASH_REDIS_REST_TOKEN" || log_warn "Failed to set UPSTASH_REDIS_REST_TOKEN (may already exist)"
fi

if [ -n "${SENTRY_DSN:-}" ] && [[ "$SENTRY_DSN" != your-* ]]; then
  vercel env add NEXT_PUBLIC_SENTRY_DSN production <<< "$SENTRY_DSN" || log_warn "Failed to set NEXT_PUBLIC_SENTRY_DSN (may already exist)"
  if [ -n "${SENTRY_AUTH_TOKEN:-}" ] && [[ "$SENTRY_AUTH_TOKEN" != your-* ]]; then
    vercel env add SENTRY_AUTH_TOKEN production <<< "$SENTRY_AUTH_TOKEN" || log_warn "Failed to set SENTRY_AUTH_TOKEN (may already exist)"
  fi
fi

log_info "✅ Vercel environment variables configured"

# Configure Firebase CLI
log_step "Configuring Firebase CLI..."

# Switch to production project
firebase use "$FIREBASE_PROD_PROJECT_ID" || {
  log_error "Failed to switch Firebase project. Make sure you have access to: $FIREBASE_PROD_PROJECT_ID"
  exit 1
}

log_info "✅ Firebase CLI configured for project: $FIREBASE_PROD_PROJECT_ID"

# Deploy Firestore rules and indexes
log_step "Deploying Firestore rules and indexes..."

if [ -f "$PROJECT_ROOT/firestore.rules" ]; then
  firebase deploy --only firestore:rules || {
    log_error "Failed to deploy Firestore rules"
    exit 1
  }
  log_info "✅ Firestore rules deployed"
else
  log_warn "firestore.rules not found, skipping rules deployment"
fi

if [ -f "$PROJECT_ROOT/firestore.indexes.json" ]; then
  firebase deploy --only firestore:indexes || {
    log_error "Failed to deploy Firestore indexes"
    exit 1
  }
  log_info "✅ Firestore indexes deployed"
else
  log_warn "firestore.indexes.json not found, skipping indexes deployment"
fi

# Verify configuration
log_step "Verifying configuration..."

# Check Vercel project
if vercel project ls | grep -q "$VERCEL_PROD_PROJECT"; then
  log_info "✅ Vercel project found: $VERCEL_PROD_PROJECT"
else
  log_warn "Vercel project not found: $VERCEL_PROD_PROJECT"
  log_info "You may need to create it manually or link it: vercel link"
fi

# Summary
log_step "Setup complete! ✅"

echo ""
log_info "Next steps:"
echo "  1. Review Vercel environment variables: vercel env ls"
echo "  2. Trigger a production deployment: vercel --prod"
echo "  3. Test your production URL: $VERCEL_PROD_URL"
echo "  4. Monitor Firebase Console: https://console.firebase.google.com/project/$FIREBASE_PROD_PROJECT_ID"
echo ""
log_info "Your secure configuration template is saved at:"
echo "  $TEMPLATE_FILE"
echo ""
log_warn "⚠️  Remember: Never commit .env.production.secure.template to git!"

