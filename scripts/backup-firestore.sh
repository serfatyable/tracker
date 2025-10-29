#!/bin/bash

################################################################################
# Firestore Backup Script
#
# This script exports Firestore data to Google Cloud Storage for disaster
# recovery and compliance purposes.
#
# USAGE:
#   ./scripts/backup-firestore.sh [options]
#
# OPTIONS:
#   -p, --project     Firebase project ID (defaults to active gcloud project)
#   -b, --bucket      GCS bucket name (defaults to <project-id>-firestore-backups)
#   -c, --collections Comma-separated list of collections (defaults to all)
#   -h, --help        Show this help message
#
# REQUIREMENTS:
#   - gcloud CLI installed and authenticated
#   - IAM role: Cloud Datastore Import Export Admin
#   - GCS bucket with appropriate permissions
#
# EXAMPLES:
#   ./scripts/backup-firestore.sh
#   ./scripts/backup-firestore.sh -p my-project -b my-backup-bucket
#   ./scripts/backup-firestore.sh -c users,rotations,tasks
#
# AUTOMATION:
#   Set up Cloud Scheduler to run this script daily:
#   gcloud scheduler jobs create http firestore-daily-backup \
#     --schedule="0 2 * * *" \
#     --uri="https://firestore.googleapis.com/v1/projects/PROJECT_ID:export" \
#     --http-method=POST \
#     --headers="Content-Type=application/json" \
#     --message-body='{"outputUriPrefix":"gs://BUCKET_NAME/backups"}'
#
################################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
PROJECT_ID=""
BUCKET_NAME=""
COLLECTIONS=""
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y%m%d)

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

# Function to show help
show_help() {
  head -n 35 "$0" | tail -n 30 | sed 's/^# //' | sed 's/^#//'
  exit 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--project)
      PROJECT_ID="$2"
      shift 2
      ;;
    -b|--bucket)
      BUCKET_NAME="$2"
      shift 2
      ;;
    -c|--collections)
      COLLECTIONS="$2"
      shift 2
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

# Set default bucket name if not specified
if [ -z "$BUCKET_NAME" ]; then
  BUCKET_NAME="${PROJECT_ID}-firestore-backups"
  log_info "Using default bucket: gs://$BUCKET_NAME"
fi

# Verify gcloud authentication
log_info "Verifying gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
  log_error "Not authenticated with gcloud. Run: gcloud auth login"
  exit 1
fi

# Check if bucket exists, create if it doesn't
log_info "Checking if backup bucket exists..."
if ! gsutil ls -b "gs://$BUCKET_NAME" &>/dev/null; then
  log_warn "Bucket gs://$BUCKET_NAME does not exist. Creating..."

  # Create bucket in EU region (matches Firestore region as per CLAUDE.md)
  gsutil mb -l europe-west1 -c STANDARD "gs://$BUCKET_NAME"

  # Set lifecycle rule to delete backups older than 30 days
  cat > /tmp/lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {"age": 30}
      }
    ]
  }
}
EOF

  gsutil lifecycle set /tmp/lifecycle.json "gs://$BUCKET_NAME"
  rm /tmp/lifecycle.json

  log_info "Created bucket with 30-day retention policy"
else
  log_info "Bucket exists: gs://$BUCKET_NAME"
fi

# Build export URI
EXPORT_URI="gs://$BUCKET_NAME/backups/$DATE_ONLY/$TIMESTAMP"

# Build gcloud command
log_info "Starting Firestore export..."
log_info "Project: $PROJECT_ID"
log_info "Destination: $EXPORT_URI"

if [ -n "$COLLECTIONS" ]; then
  log_info "Collections: $COLLECTIONS"

  # Convert comma-separated list to space-separated with --collection-ids prefix
  COLLECTION_IDS=$(echo "$COLLECTIONS" | sed 's/,/ --collection-ids=/g')

  # Run export for specific collections
  gcloud firestore export "$EXPORT_URI" \
    --project="$PROJECT_ID" \
    --collection-ids="$COLLECTION_IDS" \
    --async
else
  log_info "Collections: ALL"

  # Run export for all collections
  gcloud firestore export "$EXPORT_URI" \
    --project="$PROJECT_ID" \
    --async
fi

EXPORT_EXIT_CODE=$?

if [ $EXPORT_EXIT_CODE -eq 0 ]; then
  log_info "✅ Firestore export started successfully"
  log_info "Export will run asynchronously in the background"
  log_info "Check status with: gcloud firestore operations list --project=$PROJECT_ID"
  log_info "Backup location: $EXPORT_URI"

  # Create metadata file
  METADATA_FILE="/tmp/backup_metadata_$TIMESTAMP.json"
  cat > "$METADATA_FILE" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "date": "$DATE_ONLY",
  "project_id": "$PROJECT_ID",
  "export_uri": "$EXPORT_URI",
  "collections": "${COLLECTIONS:-all}",
  "status": "initiated",
  "initiated_by": "$(gcloud config get-value account 2>/dev/null)",
  "script_version": "1.0"
}
EOF

  # Upload metadata to GCS
  gsutil cp "$METADATA_FILE" "${EXPORT_URI}_metadata.json"
  rm "$METADATA_FILE"

  log_info "Metadata saved: ${EXPORT_URI}_metadata.json"

  # List recent backups
  log_info "\nRecent backups:"
  gsutil ls -l "gs://$BUCKET_NAME/backups/" | tail -n 10

  exit 0
else
  log_error "❌ Firestore export failed with exit code: $EXPORT_EXIT_CODE"
  log_error "Check IAM permissions: https://cloud.google.com/firestore/docs/manage-data/export-import"
  log_error "Required role: Cloud Datastore Import Export Admin"
  exit 1
fi
