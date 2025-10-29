#!/bin/bash

################################################################################
# Firestore Restore Script
#
# This script restores Firestore data from a Google Cloud Storage backup.
# ⚠️  WARNING: This operation can overwrite existing data. Use with caution!
#
# USAGE:
#   ./scripts/restore-firestore.sh [options]
#
# OPTIONS:
#   -p, --project     Firebase project ID (defaults to active gcloud project)
#   -s, --source      GCS backup URI (e.g., gs://bucket/backups/20250129_120000)
#   -c, --collections Comma-separated list of collections to restore (defaults to all)
#   -l, --list        List available backups in bucket
#   --dry-run         Show what would be restored without actually restoring
#   -h, --help        Show this help message
#
# REQUIREMENTS:
#   - gcloud CLI installed and authenticated
#   - IAM role: Cloud Datastore Import Export Admin
#   - Firestore backup in GCS bucket
#
# EXAMPLES:
#   # List available backups
#   ./scripts/restore-firestore.sh --list
#
#   # Restore all collections from specific backup
#   ./scripts/restore-firestore.sh -s gs://my-bucket/backups/20250129_120000
#
#   # Restore specific collections only
#   ./scripts/restore-firestore.sh -s gs://... -c users,rotations
#
#   # Dry run (preview what would be restored)
#   ./scripts/restore-firestore.sh -s gs://... --dry-run
#
# ⚠️  IMPORTANT NOTES:
#   - Restore operation can take several minutes to hours for large datasets
#   - Existing documents with same IDs will be overwritten
#   - Documents not in backup will remain in Firestore (not deleted)
#   - Always test restore in staging environment first
#   - Consider backing up current data before restoring
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID=""
SOURCE_URI=""
COLLECTIONS=""
LIST_BACKUPS=false
DRY_RUN=false

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
  echo -e "${BLUE}[STEP]${NC} $1"
}

# Function to show help
show_help() {
  head -n 50 "$0" | tail -n 45 | sed 's/^# //' | sed 's/^#//'
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    -s|--source)
      SOURCE_URI="$2"
      shift 2
      ;;
    -c|--collections)
      COLLECTIONS="$2"
      shift 2
      ;;
    -l|--list)
      LIST_BACKUPS=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      show_help
      ;;
    *)
      log_error "Unknown option: $1"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Get project ID from gcloud if not specified
if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
  if [ -z "$PROJECT_ID" ]; then
    log_error "No project ID specified and no active gcloud project found."
    log_error "Set active project with: gcloud config set project PROJECT_ID"
    log_error "Or specify project with: -p PROJECT_ID"
    exit 1
  fi
  log_info "Using active gcloud project: $PROJECT_ID"
fi

# Default bucket name
BUCKET_NAME="${PROJECT_ID}-firestore-backups"

# Verify gcloud authentication
log_info "Verifying gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
  log_error "Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

# Handle --list flag
if [ "$LIST_BACKUPS" = true ]; then
  log_step "Listing available backups in gs://$BUCKET_NAME/backups/"
  echo ""

  if ! gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
    log_error "Backup bucket gs://$BUCKET_NAME does not exist"
    exit 1
  fi

  # List backups with metadata
  gsutil ls -r "gs://$BUCKET_NAME/backups/**" | grep -E "backups/[0-9]{8}" | sort -r | head -n 20

  echo ""
  log_info "Showing 20 most recent backups"
  log_info "Use: ./scripts/restore-firestore.sh -s gs://$BUCKET_NAME/backups/YYYYMMDD_HHMMSS"
  exit 0
fi

# Validate source URI is provided
if [ -z "$SOURCE_URI" ]; then
  log_error "Source URI is required. Use -s or --source"
  log_error "List available backups with: ./scripts/restore-firestore.sh --list"
  exit 1
fi

# Verify source exists
log_step "Verifying backup exists..."
if ! gsutil ls "$SOURCE_URI" &>/dev/null; then
  log_error "Backup not found: $SOURCE_URI"
  log_error "List available backups with: ./scripts/restore-firestore.sh --list"
  exit 1
fi

# Show backup metadata if available
METADATA_URI="${SOURCE_URI}_metadata.json"
if gsutil ls "$METADATA_URI" &>/dev/null; then
  log_info "Backup metadata:"
  gsutil cat "$METADATA_URI" | jq '.' 2>/dev/null || gsutil cat "$METADATA_URI"
  echo ""
fi

# Display restore plan
log_step "Restore Plan"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Project:      $PROJECT_ID"
echo "Source:       $SOURCE_URI"
echo "Collections:  ${COLLECTIONS:-ALL}"
echo "Dry Run:      $DRY_RUN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Safety confirmation (skip in dry-run mode)
if [ "$DRY_RUN" = false ]; then
  log_warn "⚠️  WARNING: This operation will overwrite existing data in Firestore!"
  log_warn "⚠️  Documents with same IDs will be replaced with backup versions"
  log_warn "⚠️  Always test restore in staging environment first"
  echo ""
  read -p "Are you sure you want to proceed? (type 'yes' to confirm): " CONFIRM

  if [ "$CONFIRM" != "yes" ]; then
    log_info "Restore cancelled by user"
    exit 0
  fi
fi

# Build gcloud command
if [ "$DRY_RUN" = true ]; then
  log_info "🔍 DRY RUN - No data will be modified"
  log_info "Command that would be executed:"
  echo ""

  if [ -n "$COLLECTIONS" ]; then
    COLLECTION_IDS=$(echo "$COLLECTIONS" | sed 's/,/ --collection-ids=/g')
    echo "gcloud firestore import \"$SOURCE_URI\" \\"
    echo "  --project=\"$PROJECT_ID\" \\"
    echo "  --collection-ids=\"$COLLECTION_IDS\" \\"
    echo "  --async"
  else
    echo "gcloud firestore import \"$SOURCE_URI\" \\"
    echo "  --project=\"$PROJECT_ID\" \\"
    echo "  --async"
  fi

  echo ""
  log_info "Remove --dry-run flag to execute restore"
  exit 0
fi

# Execute restore
log_step "Starting Firestore restore..."

if [ -n "$COLLECTIONS" ]; then
  log_info "Restoring collections: $COLLECTIONS"

  COLLECTION_IDS=$(echo "$COLLECTIONS" | sed 's/,/ --collection-ids=/g')

  gcloud firestore import "$SOURCE_URI" \
    --project="$PROJECT_ID" \
    --collection-ids="$COLLECTION_IDS" \
    --async
else
  log_info "Restoring all collections"

  gcloud firestore import "$SOURCE_URI" \
    --project="$PROJECT_ID" \
    --async
fi

RESTORE_EXIT_CODE=$?

if [ $RESTORE_EXIT_CODE -eq 0 ]; then
  log_info "✅ Firestore restore initiated successfully"
  log_info "Restore will run asynchronously in the background"
  log_info "Check status with: gcloud firestore operations list --project=$PROJECT_ID"
  log_info "Monitor progress in Firebase Console: https://console.firebase.google.com/project/$PROJECT_ID/firestore"
  echo ""
  log_warn "⏳ Large restores may take several minutes to hours"
  log_warn "⏳ Do not start another restore until this one completes"

  exit 0
else
  log_error "❌ Firestore restore failed with exit code: $RESTORE_EXIT_CODE"
  log_error "Check IAM permissions: https://cloud.google.com/firestore/docs/manage-data/export-import"
  log_error "Required role: Cloud Datastore Import Export Admin"
  exit 1
fi
