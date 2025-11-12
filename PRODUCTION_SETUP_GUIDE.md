# Production Setup Guide

This guide walks you through setting up production Firebase and Vercel projects **securely** without sharing credentials directly.

## 🔒 Security Approach

**I cannot directly access your Firebase/Vercel accounts** (for security reasons), but I've created scripts that **you run locally** after authenticating with your own credentials. This is the most secure approach.

## 📋 Prerequisites

Before starting, ensure you have:

1. ✅ **Node.js 20+** installed
2. ✅ **Vercel CLI** installed: `npm i -g vercel`
3. ✅ **Firebase CLI** installed: `npm i -g firebase-tools`
4. ✅ **Git** repository cloned locally
5. ✅ **Access** to:
   - Firebase Console (https://console.firebase.google.com)
   - Vercel Dashboard (https://vercel.com)
   - GitHub repository

## 🚀 Step-by-Step Setup

### Step 1: Create Production Firebase Project

**Time: 10-15 minutes**

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Click "Add project"** (or use existing if you prefer)
3. **Enter project name**: `Tracker Production` (or your preferred name)
4. **Choose Google Analytics**: Optional (you can skip)
5. **Wait for project creation** (30 seconds)
6. **Enable Billing**:
   - Go to Project Settings → Usage and billing
   - Link a billing account (required for backups and higher quotas)
7. **Create Firestore Database**:
   - Go to Firestore Database → Create database
   - Choose **Production mode**
   - Select region: **europe-west3 (Frankfurt)** or **eur3** (matches your staging)
   - Click "Enable"
8. **Enable Authentication**:
   - Go to Authentication → Get started
   - Enable **Email/Password** provider
   - Add authorized domains:
     - `tracker-production.vercel.app` (your Vercel URL)
     - Your custom domain (if you have one)
9. **Get Web App Credentials**:
   - Go to Project Overview → `</>` icon → Add app → Web
   - Register app name: `tracker-prod-web`
   - **Copy the Firebase config** (you'll need this in Step 3)
10. **Create Service Account**:
    - Go to Project Settings → Service Accounts
    - Click "Generate new private key"
    - Download the JSON file (keep it secure!)
    - **Extract these values** (you'll need them in Step 3):
      - `project_id`
      - `client_email`
      - `private_key` (keep the `\n` characters)

**✅ Checkpoint**: You should have:

- Firebase project ID
- Firebase web app config (API key, auth domain, etc.)
- Service account JSON file

---

### Step 2: Create Production Vercel Project

**Time: 5 minutes**

1. **Go to Vercel Dashboard**: https://vercel.com
2. **Click "New Project"**
3. **Import your GitHub repository** (same repo as staging)
4. **Configure project**:
   - Project name: `tracker-production` (or your preferred name)
   - Framework: Next.js (auto-detected)
   - Root directory: `./` (default)
   - Build command: `pnpm build`
   - Install command: `pnpm install`
   - Output directory: `.next`
   - Node version: `20.x`
5. **Set Production Branch**: `main`
6. **Click "Deploy"** (this will create the project)
7. **Note your production URL**: `tracker-production.vercel.app` (or custom domain)

**✅ Checkpoint**: You should have:

- Vercel project created
- Production URL

---

### Step 3: Fill Out Secure Configuration Template

**Time: 5 minutes**

1. **Open the template file**:

   ```bash
   # In your project root
   code .env.production.secure.template
   # Or use any text editor
   ```

2. **Fill out all values** from Step 1 and Step 2:
   - Firebase web app config → `FIREBASE_PROD_*` variables
   - Service account JSON → `FIREBASE_PROD_ADMIN_*` variables
   - Vercel project name → `VERCEL_PROD_PROJECT`
   - Production URL → `VERCEL_PROD_URL`

3. **For optional services** (set up later if needed):
   - Upstash Redis (for rate limiting)
   - Sentry (for error tracking)
   - Analytics providers

4. **Save the file** (it's already gitignored, so it won't be committed)

**⚠️ Important**:

- Replace ALL `your-*` placeholders with real values
- Keep quotes around `FIREBASE_PROD_ADMIN_PRIVATE_KEY` value
- Don't share this file with anyone (it contains secrets)

---

### Step 4: Authenticate CLI Tools

**Time: 2 minutes**

Run these commands locally:

```bash
# Authenticate with Vercel
vercel login

# Authenticate with Firebase
firebase login

# Verify authentication
vercel whoami
firebase projects:list
```

**✅ Checkpoint**: Both CLIs should show your account/projects

---

### Step 5: Run Setup Script

**Time: 2-3 minutes**

The setup script will:

- ✅ Validate your configuration
- ✅ Set all Vercel environment variables
- ✅ Configure Firebase CLI for production project
- ✅ Deploy Firestore rules and indexes

```bash
# Make script executable
chmod +x scripts/setup-production.sh

# Run setup
./scripts/setup-production.sh
```

**What happens**:

1. Script reads `.env.production.secure.template`
2. Validates all required variables are filled
3. Sets Vercel environment variables via CLI
4. Switches Firebase CLI to production project
5. Deploys Firestore rules and indexes
6. Verifies configuration

**✅ Checkpoint**: Script should complete without errors

---

### Step 6: Verify Configuration

**Time: 5 minutes**

1. **Check Vercel environment variables**:

   ```bash
   vercel env ls
   ```

   Should show all variables set for `production` environment

2. **Check Firebase project**:

   ```bash
   firebase use
   ```

   Should show your production project ID

3. **Verify Firestore rules deployed**:
   - Go to Firebase Console → Firestore Database → Rules
   - Should show your `firestore.rules` content

4. **Trigger a test deployment**:
   ```bash
   vercel --prod
   ```
   Or push to `main` branch (if auto-deploy is enabled)

---

### Step 7: Set Up Additional Services (Optional but Recommended)

#### 7.1 Upstash Redis (Rate Limiting)

**Time: 5 minutes**

1. **Sign up**: https://upstash.com
2. **Create Redis database**:
   - Region: `europe-west1` (matches Firestore)
   - Name: `tracker-production`
3. **Get credentials**:
   - REST URL: `https://your-db.upstash.io`
   - REST Token: `your-token`
4. **Add to template** and re-run setup script, or set manually:
   ```bash
   vercel env add UPSTASH_REDIS_REST_URL production
   vercel env add UPSTASH_REDIS_REST_TOKEN production
   ```

#### 7.2 Sentry (Error Tracking)

**Time: 10 minutes**

1. **Sign up**: https://sentry.io
2. **Create project**:
   - Platform: Next.js
   - Project name: `tracker-production`
3. **Get DSN**: Settings → Projects → Your Project → Client Keys (DSN)
4. **Create auth token** (optional, for source maps):
   - Settings → Auth Tokens → Create New Token
   - Scopes: `project:releases`, `project:write`
5. **Add to template** and re-run setup script, or set manually:
   ```bash
   vercel env add NEXT_PUBLIC_SENTRY_DSN production
   vercel env add SENTRY_AUTH_TOKEN production
   ```

---

## 🔍 Troubleshooting

### Script fails with "Missing configuration variables"

**Solution**: Make sure you filled out ALL required variables in `.env.production.secure.template` and removed all `your-*` placeholders.

### Vercel CLI authentication fails

**Solution**:

```bash
vercel logout
vercel login
```

### Firebase CLI can't find project

**Solution**: Make sure you have access to the Firebase project. Check:

```bash
firebase projects:list
```

If project doesn't appear, you may need to be added as a member in Firebase Console.

### Firestore rules deployment fails

**Solution**: Make sure you have the correct permissions:

- Role: `Firebase Admin` or `Firebase Rules Admin`
- Check: Firebase Console → Project Settings → Users and permissions

---

## ✅ Post-Setup Checklist

After running the setup script, verify:

- [ ] All Vercel environment variables are set (`vercel env ls`)
- [ ] Firebase project is active (`firebase use`)
- [ ] Firestore rules are deployed (check Firebase Console)
- [ ] Firestore indexes are deployed (check Firebase Console)
- [ ] Production deployment succeeds (`vercel --prod`)
- [ ] Production URL loads correctly
- [ ] Authentication works (sign up/sign in)
- [ ] Environment validation passes (check build logs)

---

## 🔐 Security Best Practices

1. **Never commit** `.env.production.secure.template` to git (it's already gitignored)
2. **Delete the template** after setup (or keep it as secure backup)
3. **Rotate credentials** if template is ever exposed
4. **Use Vercel environment variables** for all secrets (never hardcode)
5. **Enable 2FA** on Firebase and Vercel accounts
6. **Limit access** to production projects (only trusted team members)

---

## 📞 Need Help?

If you encounter issues:

1. **Check script output** for specific error messages
2. **Verify CLI authentication**: `vercel whoami` and `firebase projects:list`
3. **Check Firebase Console** for project status
4. **Check Vercel Dashboard** for deployment logs
5. **Review this guide** for step-by-step instructions

---

## 🎯 Next Steps

After production setup is complete:

1. ✅ Set up Upstash Redis (rate limiting)
2. ✅ Set up Sentry (error tracking)
3. ✅ Configure automated backups (Firestore)
4. ✅ Set up monitoring and alerts
5. ✅ Run load testing
6. ✅ Deploy to production!

See `DEPLOYMENT_TASKS.md` for the complete production readiness checklist.
