# Environment Variables Template

Copy this file's contents to create your `.env.local` file.

## Client-Side Variables (NEXT*PUBLIC*\*)

These are safe to expose in the browser and are required for Firebase client SDK:

```bash
# Firebase Web App Configuration
# Get from: Firebase Console → Project Settings → General → Your apps
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key-here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Optional
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789

# Local development only
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false

# Application URL (used for calendar subscriptions, redirects, etc.)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Application environment (development, staging, production)
NEXT_PUBLIC_APP_ENV=development
```

## Server-Side Variables (NEVER commit!)

These are SECRET and should NEVER be committed to git:

```bash
# Firebase Admin SDK (Server-side authentication)
# Get from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

### How to get Firebase Admin SDK credentials:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click the gear icon → Project Settings
4. Navigate to "Service Accounts" tab
5. Click "Generate New Private Key"
6. Download the JSON file
7. Extract the values:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY` (keep the quotes and \n characters)

## Rate Limiting Configuration (Optional in development, REQUIRED for production)

Rate limiting protects your API endpoints from abuse, brute force attacks, and DDoS:

```bash
# Upstash Redis Configuration
# Sign up at: https://upstash.com
# Create a Redis database in europe-west1 region (matches Firestore)
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
```

**Note:** Rate limiting is automatically disabled in development if these variables are not set. However, **you MUST configure rate limiting for production** to prevent abuse.

See `RATE_LIMITING_GUIDE.md` for detailed setup instructions.

## Error Tracking Configuration (Optional but highly recommended)

Error tracking with Sentry provides real-time notifications, stack traces, and monitoring:

```bash
# Sentry Configuration
# Sign up at: https://sentry.io
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321

# Optional: Auth token for uploading source maps (improves error debugging)
# Get from: Sentry → Settings → Auth Tokens → Create New Token
# Scopes needed: project:releases, project:write
SENTRY_AUTH_TOKEN=your-sentry-auth-token
```

**Note:** Error tracking is automatically disabled if `NEXT_PUBLIC_SENTRY_DSN` is not set. For production deployments, error tracking is **highly recommended** to detect and fix issues quickly.

See `SENTRY_SETUP_GUIDE.md` for detailed setup instructions.

## Production Deployment

For Vercel or other hosting:

1. Add all variables to your hosting provider's environment variables
2. **Never** commit `.env.local` or production credentials to git
3. Ensure `.env.local` is in `.gitignore`

## Local Development with Emulators

For development without production Firebase:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=dummy
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tracker-local
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tracker-local
NEXT_PUBLIC_FIREBASE_APP_ID=local-app
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

# Run with:
pnpm dev:emu
```
