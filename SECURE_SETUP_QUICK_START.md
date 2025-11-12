# 🔒 Secure Production Setup - Quick Start

## How Secure Sharing Works

**I cannot directly access your Firebase/Vercel accounts** (for security), but I've created scripts that **you run locally** after authenticating. This is the most secure approach.

## 🚀 Quick Setup (5 Steps)

### Step 1: Create the Configuration Template

```bash
# Run this script to create the template
./scripts/create-secure-template.sh
```

This creates `.env.production.secure.template` (already gitignored).

### Step 2: Fill Out the Template

Open `.env.production.secure.template` and fill in:

1. **Firebase Production Project** (from Firebase Console):
   - Project ID, API Key, Auth Domain, Storage Bucket, App ID
   - Service Account credentials (from JSON file)

2. **Vercel Production Project**:
   - Project name: `tracker-production`
   - Production URL: `https://tracker-production.vercel.app`

3. **Optional Services** (set up later if needed):
   - Upstash Redis (for rate limiting)
   - Sentry (for error tracking)

### Step 3: Authenticate CLI Tools

```bash
# Authenticate with Vercel
vercel login

# Authenticate with Firebase
firebase login

# Verify
vercel whoami
firebase projects:list
```

### Step 4: Run Setup Script

```bash
# Make executable (if needed)
chmod +x scripts/setup-production.sh

# Run setup
./scripts/setup-production.sh
```

**What it does**:

- ✅ Validates your configuration
- ✅ Sets all Vercel environment variables
- ✅ Configures Firebase CLI for production
- ✅ Deploys Firestore rules and indexes

### Step 5: Verify

```bash
# Check Vercel env vars
vercel env ls

# Check Firebase project
firebase use

# Trigger deployment
vercel --prod
```

## 📋 Alternative: Manual Setup

If the script doesn't work, you can set variables manually:

### Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Select project: `tracker-production`
3. Settings → Environment Variables
4. Add each variable from your template:
   - `NEXT_PUBLIC_FIREBASE_API_KEY` = (from template)
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = (from template)
   - ... (all variables from template)
5. Set environment to: **Production**

### Firebase CLI

```bash
# Switch to production project
firebase use YOUR_PROJECT_ID

# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## 🔐 Security Notes

1. ✅ `.env.production.secure.template` is **gitignored** (never committed)
2. ✅ Scripts run **locally** on your machine (credentials never leave)
3. ✅ Variables are sent directly to Vercel/Firebase APIs (encrypted)
4. ⚠️ **Never share** the template file or commit it to git
5. ⚠️ **Delete** the template after setup (or keep as secure backup)

## ❓ Troubleshooting

### "Vercel CLI not found"

```bash
npm i -g vercel
```

### "Firebase CLI not found"

```bash
npm i -g firebase-tools
```

### "Not authenticated"

```bash
vercel login
firebase login
```

### "Variable already exists"

The script will try to update it. If it fails, set it manually in Vercel Dashboard.

### Script fails

Use manual setup (see above) or check `PRODUCTION_SETUP_GUIDE.md` for detailed steps.

## 📚 Full Documentation

- **Detailed Guide**: `PRODUCTION_SETUP_GUIDE.md`
- **Deployment Checklist**: `DEPLOYMENT_TASKS.md`
- **Environment Template**: `ENV_TEMPLATE.md`

## ✅ After Setup

Once production is configured:

1. ✅ Set up Upstash Redis (rate limiting)
2. ✅ Set up Sentry (error tracking)
3. ✅ Configure automated backups
4. ✅ Run load testing
5. ✅ Deploy to production!

See `DEPLOYMENT_TASKS.md` for complete checklist.
