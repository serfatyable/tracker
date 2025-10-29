# Firestore Backup & Disaster Recovery Guide

## Overview

This document describes the backup and disaster recovery procedures for the Tracker application's Firestore database. **Regular backups are critical** for protecting against data loss from accidental deletion, corruption, security incidents, or infrastructure failures.

**Implementation Date:** 2025-10-29
**Status:** ✅ Implemented with Automated Scripts

---

## Table of Contents

- [Quick Start](#quick-start)
- [Backup Strategy](#backup-strategy)
- [Backup Scripts](#backup-scripts)
- [Restore Procedures](#restore-procedures)
- [Automation Setup](#automation-setup)
- [Monitoring & Verification](#monitoring--verification)
- [Disaster Recovery Scenarios](#disaster-recovery-scenarios)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Quick Start

### Creating a Manual Backup

```bash
# Simple backup (uses defaults)
./scripts/backup-firestore.sh

# Backup with specific project and bucket
./scripts/backup-firestore.sh -p my-project -b my-backup-bucket

# Backup specific collections only
./scripts/backup-firestore.sh -c users,rotations,tasks
```

### Listing Available Backups

```bash
./scripts/restore-firestore.sh --list
```

### Restoring from Backup

```bash
# Dry run first (preview what would be restored)
./scripts/restore-firestore.sh -s gs://bucket/backups/20250129_120000 --dry-run

# Actual restore (requires confirmation)
./scripts/restore-firestore.sh -s gs://bucket/backups/20250129_120000
```

---

## Backup Strategy

### Backup Schedule

| Frequency | Retention | Purpose | Method |
|-----------|-----------|---------|--------|
| **Daily** | 30 days | Point-in-time recovery | Automated (Cloud Scheduler) |
| **Weekly** | 90 days | Long-term recovery | Automated (Cloud Scheduler) |
| **Pre-deployment** | 7 days | Rollback capability | Manual |
| **Pre-maintenance** | 7 days | Safety net for risky operations | Manual |

### What Gets Backed Up

**Included:**
- All Firestore collections (users, rotations, tasks, etc.)
- Document metadata (created/updated timestamps)
- Firestore indexes
- Security rules (separate backup)

**NOT Included:**
- Firebase Storage files (requires separate backup)
- Authentication users (managed by Firebase, has built-in backup)
- Cloud Functions code (stored in git repository)

### Storage Location

**Primary Backup Bucket:**
- Location: `gs://{project-id}-firestore-backups/`
- Region: `europe-west1` (EU) - matches Firestore region
- Storage Class: `STANDARD`
- Lifecycle: Auto-delete after 30 days

**Backup Structure:**
```
gs://{project-id}-firestore-backups/
├── backups/
│   ├── 20250129/
│   │   ├── 020000/              ← Daily backup (2:00 AM)
│   │   │   ├── all_namespaces/
│   │   │   │   └── ... (backup files)
│   │   │   └── metadata.json
│   │   └── 020000_metadata.json
│   ├── 20250130/
│   │   └── 020000/
│   └── ...
```

---

## Backup Scripts

### backup-firestore.sh

**Location:** `scripts/backup-firestore.sh`

**Purpose:** Export Firestore data to Google Cloud Storage

**Usage:**
```bash
./scripts/backup-firestore.sh [options]

OPTIONS:
  -p, --project     Firebase project ID (defaults to active gcloud project)
  -b, --bucket      GCS bucket name (defaults to {project-id}-firestore-backups)
  -c, --collections Comma-separated collections (defaults to all)
  -h, --help        Show help message
```

**Features:**
- ✅ Automatic bucket creation with lifecycle rules
- ✅ 30-day retention policy
- ✅ Backup metadata with timestamp and user info
- ✅ Async operation (doesn't block)
- ✅ Error handling and validation
- ✅ Colorized output for easy monitoring

**Examples:**

```bash
# Backup everything (recommended for production)
./scripts/backup-firestore.sh

# Backup specific project
./scripts/backup-firestore.sh -p tracker-production

# Backup only critical collections
./scripts/backup-firestore.sh -c users,rotations,tasks,auditLog

# Backup to custom bucket
./scripts/backup-firestore.sh -b my-custom-backup-bucket
```

**Output:**
```
[INFO] Using active gcloud project: tracker-production
[INFO] Using default bucket: gs://tracker-production-firestore-backups
[INFO] Bucket exists: gs://tracker-production-firestore-backups
[INFO] Starting Firestore export...
[INFO] Project: tracker-production
[INFO] Destination: gs://tracker-production-firestore-backups/backups/20250129/020000
[INFO] Collections: ALL
[INFO] ✅ Firestore export started successfully
[INFO] Export will run asynchronously in the background
[INFO] Check status with: gcloud firestore operations list --project=tracker-production
```

### restore-firestore.sh

**Location:** `scripts/restore-firestore.sh`

**Purpose:** Restore Firestore data from a backup

**Usage:**
```bash
./scripts/restore-firestore.sh [options]

OPTIONS:
  -p, --project     Firebase project ID
  -s, --source      GCS backup URI (required)
  -c, --collections Comma-separated collections to restore (optional)
  -l, --list        List available backups
  --dry-run         Preview without restoring
  -h, --help        Show help message
```

**Features:**
- ✅ Safety confirmation prompt
- ✅ Dry-run mode for testing
- ✅ Backup metadata display
- ✅ Selective collection restore
- ✅ List available backups
- ✅ Async operation

**Examples:**

```bash
# List available backups
./scripts/restore-firestore.sh --list

# Dry run (preview only)
./scripts/restore-firestore.sh \
  -s gs://tracker-production-firestore-backups/backups/20250129/020000 \
  --dry-run

# Restore all collections (requires "yes" confirmation)
./scripts/restore-firestore.sh \
  -s gs://tracker-production-firestore-backups/backups/20250129/020000

# Restore specific collections only
./scripts/restore-firestore.sh \
  -s gs://tracker-production-firestore-backups/backups/20250129/020000 \
  -c users,rotations
```

**Safety Features:**
- Requires typing "yes" to confirm (prevents accidental restores)
- Dry-run mode shows exactly what would be restored
- Displays backup metadata before restoring
- Warns about overwriting existing data

---

## Restore Procedures

### Full Disaster Recovery

**Scenario:** Complete data loss - need to restore entire database

**Steps:**

1. **Identify the backup to restore:**
   ```bash
   ./scripts/restore-firestore.sh --list
   ```

2. **Verify backup integrity:**
   ```bash
   # Check backup metadata
   gsutil cat gs://bucket/backups/20250129/020000_metadata.json
   ```

3. **Test restore in staging first:**
   ```bash
   # Switch to staging project
   gcloud config set project tracker-staging

   # Dry run
   ./scripts/restore-firestore.sh \
     -s gs://tracker-production-firestore-backups/backups/20250129/020000 \
     --dry-run

   # Actual restore to staging
   ./scripts/restore-firestore.sh \
     -s gs://tracker-production-firestore-backups/backups/20250129/020000
   ```

4. **Verify staging restore:**
   - Check Firestore console for data
   - Test critical application features
   - Verify user authentication works
   - Check data integrity (counts, relationships)

5. **Restore to production:**
   ```bash
   # Switch to production project
   gcloud config set project tracker-production

   # ⚠️ CRITICAL: Create a backup before restoring
   ./scripts/backup-firestore.sh -b tracker-emergency-backup-$(date +%Y%m%d)

   # Restore from verified backup
   ./scripts/restore-firestore.sh \
     -s gs://tracker-production-firestore-backups/backups/20250129/020000
   ```

6. **Monitor restore operation:**
   ```bash
   # Check operation status
   gcloud firestore operations list --project=tracker-production

   # Watch for completion
   watch -n 10 "gcloud firestore operations list --project=tracker-production"
   ```

7. **Post-restore validation:**
   - Verify user count matches expected
   - Test authentication flow
   - Check recent data appears correctly
   - Review Sentry for errors
   - Check rate limiting is working

### Partial Recovery (Specific Collections)

**Scenario:** Need to restore only certain collections (e.g., accidentally deleted users collection)

**Steps:**

```bash
# 1. Create emergency backup first
./scripts/backup-firestore.sh -b tracker-emergency-$(date +%Y%m%d%H%M)

# 2. Restore specific collections only
./scripts/restore-firestore.sh \
  -s gs://tracker-production-firestore-backups/backups/20250129/020000 \
  -c users
```

### Point-in-Time Recovery

**Scenario:** Need to recover data as it existed at a specific time (e.g., before a bad deployment)

**Steps:**

1. Identify the backup timestamp closest to the desired point in time
2. Follow full disaster recovery process with that backup
3. Consider restoring to a separate Firestore database first for inspection

---

## Automation Setup

### Cloud Scheduler (Recommended)

**Advantages:**
- Fully managed (no server maintenance)
- Built-in retry logic
- Email notifications on failure
- Integrates with Cloud Monitoring

**Setup Steps:**

#### 1. Enable Required APIs

```bash
gcloud services enable \
  cloudscheduler.googleapis.com \
  firestore.googleapis.com \
  cloudbuild.googleapis.com
```

#### 2. Create Service Account

```bash
# Create service account for backups
gcloud iam service-accounts create firestore-backup-sa \
  --display-name="Firestore Backup Service Account"

# Grant required permissions
gcloud projects add-iam-policy-binding tracker-production \
  --member="serviceAccount:firestore-backup-sa@tracker-production.iam.gserviceaccount.com" \
  --role="roles/datastore.importExportAdmin"

gcloud projects add-iam-policy-binding tracker-production \
  --member="serviceAccount:firestore-backup-sa@tracker-production.iam.gserviceaccount.com" \
  --role="roles/storage.admin"
```

#### 3. Create Cloud Scheduler Jobs

**Daily Backup (2:00 AM UTC):**

```bash
gcloud scheduler jobs create http firestore-daily-backup \
  --location=europe-west1 \
  --schedule="0 2 * * *" \
  --time-zone="UTC" \
  --uri="https://firestore.googleapis.com/v1/projects/tracker-production/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{
    "outputUriPrefix": "gs://tracker-production-firestore-backups/backups"
  }' \
  --oauth-service-account-email="firestore-backup-sa@tracker-production.iam.gserviceaccount.com" \
  --attempt-deadline=1800s
```

**Weekly Backup (Sunday 3:00 AM UTC):**

```bash
gcloud scheduler jobs create http firestore-weekly-backup \
  --location=europe-west1 \
  --schedule="0 3 * * 0" \
  --time-zone="UTC" \
  --uri="https://firestore.googleapis.com/v1/projects/tracker-production/databases/(default):exportDocuments" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{
    "outputUriPrefix": "gs://tracker-production-firestore-backups/weekly-backups"
  }' \
  --oauth-service-account-email="firestore-backup-sa@tracker-production.iam.gserviceaccount.com" \
  --attempt-deadline=1800s
```

#### 4. Test Scheduled Jobs

```bash
# Manually trigger daily backup job
gcloud scheduler jobs run firestore-daily-backup --location=europe-west1

# Check job execution logs
gcloud scheduler jobs describe firestore-daily-backup --location=europe-west1

# View operation status
gcloud firestore operations list --project=tracker-production
```

#### 5. Set Up Notifications

```bash
# Create notification channel (email)
gcloud alpha monitoring channels create \
  --display-name="Backup Alerts" \
  --type=email \
  --channel-labels=email_address=admin@example.com

# Create alert policy for failed backups
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Firestore Backup Failed" \
  --condition-display-name="Backup job failed" \
  --condition-threshold-value=1 \
  --condition-threshold-duration=60s
```

### Alternative: Cron Job (Self-Managed)

If you prefer to run backups from your own infrastructure:

```bash
# Add to crontab (runs daily at 2:00 AM)
0 2 * * * /path/to/scripts/backup-firestore.sh -p tracker-production >> /var/log/firestore-backup.log 2>&1
```

---

## Monitoring & Verification

### Daily Verification Checklist

- [ ] Check that backup completed successfully
- [ ] Verify backup size is reasonable (not empty, not unexpectedly large)
- [ ] Confirm backup timestamp is recent
- [ ] Review Cloud Scheduler logs for errors

### Weekly Verification Tasks

- [ ] List all backups and verify retention policy working
- [ ] Check GCS bucket size and cost
- [ ] Test restore procedure in staging
- [ ] Review backup metadata for completeness

### Monthly Verification Tasks

- [ ] Perform full disaster recovery drill in staging
- [ ] Verify all collections are included in backups
- [ ] Review IAM permissions for backup service account
- [ ] Update backup documentation if procedures changed

### Monitoring Commands

**Check backup status:**
```bash
# List recent backups
gsutil ls -l gs://tracker-production-firestore-backups/backups/ | tail -n 10

# Check backup size
gsutil du -sh gs://tracker-production-firestore-backups/backups/

# View latest backup metadata
LATEST=$(gsutil ls gs://tracker-production-firestore-backups/backups/ | sort -r | head -n 1)
gsutil cat "${LATEST}*_metadata.json" | jq '.'
```

**Check operation status:**
```bash
# List all Firestore operations
gcloud firestore operations list --project=tracker-production

# Get specific operation details
gcloud firestore operations describe OPERATION_NAME --project=tracker-production
```

**Set up automated alerts:**

Create a Cloud Function to check backup age:

```javascript
// cloud-function: check-backup-age
exports.checkBackupAge = functions.pubsub
  .schedule('0 8 * * *')
  .onRun(async () => {
    const storage = new Storage();
    const [files] = await storage.bucket('tracker-production-firestore-backups').getFiles();

    const latestBackup = files
      .filter(f => f.name.includes('metadata.json'))
      .sort((a, b) => b.metadata.timeCreated - a.metadata.timeCreated)[0];

    const ageHours = (Date.now() - new Date(latestBackup.metadata.timeCreated)) / 1000 / 60 / 60;

    if (ageHours > 28) { // Alert if no backup in 28 hours
      console.error('WARNING: Latest backup is older than 28 hours!');
      // Send notification (email, Slack, PagerDuty, etc.)
    }
  });
```

---

## Disaster Recovery Scenarios

### Scenario 1: Accidental Collection Deletion

**Situation:** Admin accidentally deletes entire "users" collection

**Recovery Time Objective (RTO):** 15 minutes
**Recovery Point Objective (RPO):** Last backup (max 24 hours data loss)

**Steps:**
1. Stop all application writes (maintenance mode)
2. List backups: `./scripts/restore-firestore.sh --list`
3. Identify most recent backup
4. Restore users collection only: `./scripts/restore-firestore.sh -s gs://... -c users`
5. Verify data integrity
6. Resume normal operations

### Scenario 2: Data Corruption

**Situation:** Bad deployment corrupts data (e.g., overwrites fields incorrectly)

**RTO:** 30 minutes
**RPO:** Pre-deployment backup

**Steps:**
1. Identify when corruption occurred
2. Find backup from before corruption (check metadata)
3. Create emergency backup of current state (for forensics)
4. Test restore in staging
5. Restore to production
6. Validate data integrity
7. Fix root cause before re-deploying

### Scenario 3: Complete Database Loss

**Situation:** Entire Firestore database is lost (rare, but possible)

**RTO:** 2 hours
**RPO:** Last backup (max 24 hours)

**Steps:**
1. Confirm database is truly lost (not just network issue)
2. Create new Firestore database if needed
3. Identify most recent complete backup
4. Test restore in staging environment
5. Perform full restore to production
6. Verify all collections and data
7. Test critical application flows
8. Gradually resume traffic (e.g., canary deployment)

### Scenario 4: Ransomware/Security Incident

**Situation:** Attacker encrypts or deletes data

**RTO:** 4 hours (includes security review)
**RPO:** Last backup

**Steps:**
1. Isolate affected systems immediately
2. Revoke all API keys and tokens
3. Change all service account credentials
4. Identify clean backup (from before incident)
5. Restore to new database instance
6. Perform security audit before resuming
7. Update Firestore security rules
8. Resume operations with new credentials

---

## Troubleshooting

### Backup Issues

#### Issue: "Permission denied" error during backup

**Symptoms:**
```
ERROR: (gcloud.firestore.export) PERMISSION_DENIED: Missing or insufficient permissions.
```

**Solution:**
```bash
# Grant required IAM role
gcloud projects add-iam-policy-binding tracker-production \
  --member="user:your-email@example.com" \
  --role="roles/datastore.importExportAdmin"
```

#### Issue: "Bucket does not exist" error

**Symptoms:**
```
ERROR: Bucket gs://... does not exist
```

**Solution:**
```bash
# Create bucket manually
gsutil mb -l europe-west1 gs://tracker-production-firestore-backups

# Or let script create it automatically
./scripts/backup-firestore.sh
```

#### Issue: Backup operation stuck "in progress"

**Symptoms:**
- Operation shows as running for hours
- No progress in Firebase Console

**Solution:**
```bash
# Check operation status
gcloud firestore operations list --project=tracker-production

# If stuck for >4 hours, cancel and retry
gcloud firestore operations cancel OPERATION_NAME --project=tracker-production

# Start new backup
./scripts/backup-firestore.sh
```

### Restore Issues

#### Issue: Restore overwrites more data than expected

**Prevention:**
- Always use `--dry-run` first
- Test in staging environment
- Review backup metadata before restoring

**Recovery:**
- Restore from emergency backup created before the restore

#### Issue: Restore fails with "invalid backup format"

**Symptoms:**
```
ERROR: Invalid backup format or corrupted backup
```

**Solution:**
1. Verify backup URI is correct (should point to directory, not file)
2. Check backup metadata: `gsutil cat gs://.../metadata.json`
3. Try an older backup
4. Contact Google Cloud Support if all backups are corrupted

#### Issue: Partial restore missing some collections

**Symptoms:**
- Restore completes successfully
- But some collections are empty

**Solution:**
1. Check if collections were included in backup: `gsutil ls gs://.../all_namespaces/`
2. Verify `-c` flag if used during backup
3. Run separate restore for missing collections

---

## Best Practices

### Before Production Launch

- [ ] Test backup script works correctly
- [ ] Test restore script in staging
- [ ] Set up automated daily backups
- [ ] Configure backup monitoring and alerts
- [ ] Document disaster recovery procedures
- [ ] Train team on restore procedures
- [ ] Perform disaster recovery drill

### Ongoing Operations

- [ ] Monitor backup success daily
- [ ] Test restore monthly
- [ ] Review and update retention policies quarterly
- [ ] Keep backup scripts in version control
- [ ] Document any manual interventions
- [ ] Maintain runbook for disaster scenarios

### Security

- [ ] Limit IAM permissions to minimum required
- [ ] Use service accounts for automation (not personal accounts)
- [ ] Enable audit logging for backup operations
- [ ] Encrypt backups at rest (default in GCS)
- [ ] Restrict bucket access (no public access)
- [ ] Rotate service account keys annually

### Cost Optimization

- [ ] Set appropriate retention policies
- [ ] Use Standard storage class (not Nearline/Coldline for frequent access)
- [ ] Monitor bucket size and cost
- [ ] Delete old backups automatically (lifecycle rules)
- [ ] Consider compression for long-term archives

---

## Cost Estimation

### Storage Costs

**Assumptions:**
- Database size: 10 GB
- Daily backups: 30 days retention
- Storage class: Standard (europe-west1)

**Monthly Cost:**
```
Storage: 10 GB × 30 days × $0.020/GB/month = $6.00
Egress (restore): 10 GB × $0.12/GB (occasional) = $1.20
Operations: ~1000 operations/month × $0.004/10k ops = $0.004
────────────────────────────────────────────────────────
Total: ~$7.20/month
```

### Cloud Scheduler Costs

```
2 jobs × $0.10/job/month = $0.20/month
```

### Total Monthly Cost

**~$7.50/month** for 10 GB database with daily backups

---

## Related Documentation

- **DEPLOYMENT_TASKS.md:** Task #5 - Automated Backups
- **CLAUDE.md:** Database backup strategy
- [Cloud Firestore Export/Import](https://cloud.google.com/firestore/docs/manage-data/export-import)
- [GCS Lifecycle Management](https://cloud.google.com/storage/docs/lifecycle)

---

## Support & Escalation

### Internal Team

- **Primary Contact:** DevOps Team
- **Escalation:** CTO
- **Documentation:** This file + runbooks

### External Support

- **Google Cloud Support:** [support.google.com/cloud](https://support.google.com/cloud)
- **Firebase Support:** [firebase.google.com/support](https://firebase.google.com/support)
- **Emergency:** Open P1 ticket with Google Cloud Support

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Implemented By:** Claude Code
**Reviewed By:** Pending
