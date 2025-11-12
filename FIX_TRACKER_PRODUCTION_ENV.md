# Fix: Set Environment Variables in tracker-production Project

## Issue

Environment variables are set in the `tracker` project, but you're checking `tracker-production.vercel.app` which is a **different project**.

## Solution: Set Variables in tracker-production Project

You have two options:

### Option 1: Use Vercel Dashboard (Easiest)

1. Go to: https://vercel.com/dashboard
2. Select project: **tracker-production** (not "tracker")
3. Go to **Settings** → **Environment Variables**
4. Add all the Firebase variables (same values as before):
   - `NEXT_PUBLIC_FIREBASE_API_KEY` = `AIzaSyCP5PxPWL-R8HlAe_wEgxmj1MLeX8iQTz8`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` = `tracker-prod-286876.firebaseapp.com`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID` = `tracker-prod-286876`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` = `tracker-prod-286876.firebasestorage.app`
   - `NEXT_PUBLIC_FIREBASE_APP_ID` = `1:482502738942:web:4a026778f70252eaf0f6af`
   - `FIREBASE_PROJECT_ID` = `tracker-prod-286876`
   - `FIREBASE_CLIENT_EMAIL` = `firebase-adminsdk-fbsvc@tracker-prod-286876.iam.gserviceaccount.com`
   - `FIREBASE_PRIVATE_KEY` = (the full private key from service account JSON)
   - `NEXT_PUBLIC_APP_URL` = `https://tracker-production.vercel.app`
   - `NEXT_PUBLIC_APP_ENV` = `production`
   - `UPSTASH_REDIS_REST_URL` = `https://smiling-termite-35987.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` = `AYyTAAIncDFkZjZiZmYyYWY4Yjc0NmUxYTA0YWUzMThlZTI4MDdkMHAxMzU5ODc`
   - `NEXT_PUBLIC_SENTRY_DSN` = `https://a73b417818dd3a23b7cf3c52f88d0b59@o4510342314131456.ingest.de.sentry.io/4510342324944976`

5. Set each variable for **Production** environment
6. After adding all variables, go to **Deployments** tab
7. Click **"Redeploy"** on the latest deployment (or push a new commit)

### Option 2: Use Vercel CLI

```bash
# Link to tracker-production project
vercel link --project=tracker-production

# Then run the setup script (it will use the linked project)
./scripts/setup-production.sh
```

## After Setting Variables

1. Wait for deployment to complete (1-2 minutes)
2. Hard refresh your browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Check: https://tracker-production.vercel.app
4. Firebase error should be gone!

## Why This Happened

You have two Vercel projects:

- `tracker` - where we set variables (wrong project)
- `tracker-production` - the actual production project (needs variables)

The variables need to be in the project that matches the URL you're checking.
