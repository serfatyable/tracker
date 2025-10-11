Tracker follows Tracker_Developer_Guide_v1.0.md

[![CI](https://github.com/serfatyable/tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/serfatyable/tracker/actions/workflows/ci.yml)

## ⚠️ Project Structure (IMPORTANT)

**This project uses Next.js 15 App Router with routes at the root level.**

```
/app/          ← Routes go here (NOT /src/app)
/components/   ← Components
/lib/          ← Utilities
/types/        ← TypeScript types
```

**Never move files to /src directory** - this causes 404 errors with Next.js 15.
See `PROJECT_STRUCTURE.md` for details.

## Package manager

Use pnpm.

```bash
node -v   # should be 20.x (see .nvmrc)
pnpm install
pnpm dev
```

## Scripts

```bash
# Formatting
pnpm format            # write
pnpm format:check      # check

# Linting
pnpm lint              # report
pnpm lint:fix          # fix

# TypeScript
pnpm typecheck         # noEmit type-check

# Tests
pnpm test

# Build
pnpm build
```

## Pre-commit hooks

Husky + lint-staged run on staged files:

- Prettier write
- ESLint with --fix and no warnings allowed

If a commit fails, fix issues and re-stage.

## Environment setup:

- Put real values in Vercel Environment Variables.
- For local dev, copy `.env.example` → `.env.local` and fill the same keys.

Firestore security rules:

- Rules are defined in firestore.rules
- To deploy later:
  - Ensure Firebase CLI is installed and you are logged in.
  - Select the project: firebase use <project_id>
  - Deploy only rules: firebase deploy --only firestore:rules

Firebase Emulator (optional):

- Start emulators: firebase emulators:start
- Use emulators in app: set NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true in .env.local
- Auth: http://127.0.0.1:9099 | Firestore: 127.0.0.1:8080 | UI: http://127.0.0.1:4000

## Environment Setup

Create a `.env.local` with your Firebase Web App config:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT.firebasestorage.app
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
# For staging/prod, leave emulators off
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=
# Optional
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXX
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=XXXXXXXXXXXX
```

Local emulators (optional):

```bash
# Use placeholders and enable emulators
NEXT_PUBLIC_FIREBASE_API_KEY=dummy
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tracker-local
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tracker-local
NEXT_PUBLIC_FIREBASE_APP_ID=local-app
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true

pnpm dev:emu
```

If you see a Dev Diagnostics bar in the bottom-left, click it to view missing env keys and emulator status.

## Firestore Rules and Indexes

Deploy rules and indexes:

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

Rules summary:

- `users/{uid}`: owners can create/read/update their document
- `tasks/*`: owners can read/create/update their tasks; tutors/admins have broader access

## CI/CD Notes

- Store the same `NEXT_PUBLIC_*` variables as project/environment variables in your hosting provider or CI.
- Do not commit `.env.local`.
- Consider adding `firebase deploy` steps for rules/indexes as part of release workflow.

## Architecture and imports

- `app/`: Next.js routes and segment components
- `components/`: reusable UI components only
- `lib/`: framework-agnostic logic and services (see `lib/firebase/*`)
- `types/`: shared TS types
- `i18n/`: locale JSON and init

Path aliases (see `tsconfig.json`): `@/*`, `@app/*`, `@components/*`, `@lib/*`, `@types/*`, `@i18n/*`.

Import boundaries enforced by ESLint:

- `components` can import from `lib`, `types`
- `app` can import from `components`, `lib`, `types`, `i18n`
- `lib` can import from `lib`, `types`
