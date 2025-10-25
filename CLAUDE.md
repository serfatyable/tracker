# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**Tracker** is a bilingual (English/Hebrew) anesthesiology residency training management platform built with Next.js 15, Firebase, and TypeScript. It connects residents, tutors, and admins to streamline learning task tracking, feedback, and analytics.

**Key Principles:**

- No patient data or hospital integration
- Fully bilingual with RTL support for Hebrew
- WCAG AA accessibility compliance
- Next.js 15 App Router (routes at root level, NOT in /src)

## Technology Stack

- **Frontend:** Next.js 15.5.4 (App Router), React 18.3.1, TypeScript 5.6.3
- **Styling:** TailwindCSS 4.0.6, Headless UI 2.2.0
- **Backend:** Firebase (Firestore, Auth, Storage)
- **Testing:** Vitest 3.2.4, Testing Library, jsdom
- **i18n:** react-i18next 15.0.3
- **Package Manager:** pnpm 10.18.3
- **Node Version:** 20.x (see .nvmrc)

## Development Commands

```bash
# Development
pnpm dev                    # Start dev server (localhost:3000)
pnpm dev:clean              # Kill existing processes, clear .next, start dev
pnpm dev:emu                # Start Firebase emulators + dev server concurrently

# Building
pnpm build                  # Production build
pnpm build:clean            # Clear .next, then build
pnpm start                  # Start production server

# Code Quality
pnpm lint                   # Run ESLint
pnpm lint:fix               # Auto-fix ESLint issues
pnpm format                 # Format code with Prettier
pnpm format:check           # Check formatting without writing
pnpm typecheck              # TypeScript type checking (noEmit)

# Testing
pnpm test                   # Run tests with coverage
pnpm test:light             # Run tests with single thread (low memory)
pnpm test:mem               # Run tests with increased memory allocation
pnpm test:ci                # CI-optimized test run

# Firebase
firebase emulators:start    # Start local emulators only
firebase login              # Authenticate with Firebase
firebase use <project_id>   # Select Firebase project
firebase deploy --only firestore:rules    # Deploy Firestore rules
firebase deploy --only firestore:indexes  # Deploy Firestore indexes
```

## Project Architecture

### Critical: Next.js 15 Structure (DO NOT USE /src)

**This project keeps all code at root level. NEVER move files into a /src directory.**

```
/tracker
├── /app/              ← Routes (Next.js 15 App Router)
├── /components/       ← Reusable UI components
├── /lib/              ← Framework-agnostic logic & services
├── /types/            ← TypeScript type definitions
├── /i18n/             ← Translation files (en.json, he.json)
├── /test/             ← Test setup files
├── /public/           ← Static assets
├── /scripts/          ← Build and utility scripts
```

**Path Aliases (tsconfig.json):**

- `@/*` → root
- `@app/*` → app/
- `@components/*` → components/
- `@lib/*` → lib/
- `@types/*` → types/
- `@i18n/*` → i18n/

**Always use path aliases in imports:**

```typescript
// ✅ Correct
import { signIn } from '@/lib/firebase/auth';
import TextInput from '@/components/auth/TextInput';

// ❌ Wrong
import { signIn } from '../../lib/firebase/auth';
```

### Import Boundaries (Enforced by ESLint)

- `components/` can import from `lib/`, `types/`
- `app/` can import from `components/`, `lib/`, `types/`, `i18n/`
- `lib/` can import from `lib/`, `types/`

These boundaries are enforced by `eslint-plugin-boundaries` in eslint.config.mjs.

### Firebase Architecture

**Collections:**

- `users/{uid}` - User profiles with role (resident/tutor/admin), settings, assignments
- `rotations/{rotationId}` - Rotation definitions (ICU, OR, Block Room, PACU, Obstetrics, etc.)
- `rotationItems/{itemId}` - Hierarchical topics, subtopics, and tasks within rotations
- `tasks/{taskId}` - Logged activities per user with status tracking
- `cases/{caseId}` - Clinical/educational cases
- `onCallSchedule/{dateString}` - On-call duty assignments
- `morningMeetings/{dateString}` - Morning meeting schedule with lecturers
- `auditLog/{logId}` - System events for compliance

**Key Firebase Modules:**

- `lib/firebase/client.ts` - Firebase app initialization
- `lib/firebase/db.ts` - Firestore operations
- `lib/firebase/auth.ts` - Authentication logic with centralized error handling
- `lib/firebase/errors.ts` - Firebase error code to i18n key mapping
- `lib/hooks/` - Custom React hooks for Firebase data (useCurrentUserProfile, useRotations, etc.)

**Environment Variables (.env.local):**

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true  # For local dev with emulators
```

## Core Features & User Roles

### Residents

- Record skills, knowledge, and guidance progress
- Log cases and submit required tasks
- View feedback and performance statistics
- Browse rotations in tree/dashboard views
- Access rotation-specific resources
- Required field: `residencyStartDate` (ISO YYYY-MM-DD, past dates only)

### Tutors

- Approve/reject resident tasks with structured feedback
- Log teaching cases and monitor resident progress
- View assigned residents and pending approvals
- Access fairness analytics

### Admins

- Manage rotations, users, and system configuration
- Import/export rotations via CSV/XLSX templates
- Import on-call schedules and morning meeting rosters
- Monitor system health, quotas, and performance
- Approve user registrations (users default to "pending" status)

## Internationalization (i18n)

**Implementation:**

- Uses react-i18next with JSON translation files in `i18n/locales/`
- Language preference stored in Firestore (`users/{uid}.settings.language`)
- RTL automatically applied when Hebrew is selected
- `<html lang>` and `dir` attributes dynamically updated
- Numbers in Hebrew text remain LTR using CSS (`unicode-bidi`, `direction`)

**Translation Access:**

```typescript
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();
t('dashboard.title'); // Returns localized string
i18n.language; // Current language code ('en' or 'he')
```

**Helper Function:**

```typescript
import { getLocalized } from '@/lib/i18n/getLocalized';
// Returns item.name or item.nameHe based on current language
getLocalized(item, 'name', i18n.language);
```

## Authentication & Security

**Sign-In/Sign-Up Flow:**

- Unified auth page at `/auth`
- Fields: Full Name, Email, Password, Role, Language, Residency Start Date (residents only)
- Error handling: Generic messages on sign-in to prevent account enumeration
- On successful sign-in, language preference loaded from Firestore
- Pending users routed to `/awaiting-approval` until admin approves

**Security Measures:**

- Firestore security rules enforce least privilege
- Role-conditional fields: only residents can write `residencyStartDate`
- Input sanitization with DOMPurify
- CSP headers applied globally (next.config.js)
- IAM roles rotated every 90 days (operational policy)

**Firestore Rules:**

- Deployed via: `firebase deploy --only firestore:rules`
- Located in: `firestore.rules`
- Users can only read/write their own documents
- Tutors/admins have broader access to tasks/rotations

## Testing

**Test Setup:**

- Test files colocated in `__tests__/` directories
- Setup file: `test/setup.ts`
- Mock Firebase in tests to avoid emulator dependency

**Running Tests:**

```bash
pnpm test              # Full test suite with coverage
pnpm test:light        # Single-threaded (low memory)
pnpm test:ci           # CI optimized
```

**Coverage Target:** ≥80%

**Key Test Patterns:**

- Smoke tests for critical pages (AuthPage, ResidentPage, AdminPage, etc.)
- Component tests for UI elements (TextInput, Button, Dialog, etc.)
- Integration tests for multi-role approval flows

## Common Development Tasks

### Troubleshooting 404 Errors

If routes return 404:

```bash
pkill -f "next dev"           # Kill all Next.js processes
rm -rf .next                  # Clear build cache
pnpm dev                      # Restart dev server
```

### Adding a New Route

1. Create page.tsx in appropriate `app/` subdirectory (e.g., `app/new-page/page.tsx`)
2. Use AppShell layout for consistent UI
3. Add route to appropriate navigation (Sidebar.tsx, BottomBar.tsx)
4. Add translations to `i18n/locales/en.json` and `i18n/locales/he.json`

### Working with Firebase Emulators

1. Start emulators: `firebase emulators:start`
2. Set `NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true` in `.env.local`
3. Use `pnpm dev:emu` to run both emulators and dev server concurrently
4. Emulator UI: http://127.0.0.1:4000
5. If emulators crash, clear `.firebase` cache

### Adding New Translations

1. Add keys to `i18n/locales/en.json`
2. Add corresponding Hebrew translations to `i18n/locales/he.json`
3. Use nested keys for organization: `{ "dashboard": { "title": "Dashboard" } }`
4. Access in components: `t('dashboard.title')`

### Deploying Firestore Changes

```bash
firebase login
firebase use <project_id>
firebase deploy --only firestore:rules     # Deploy security rules
firebase deploy --only firestore:indexes   # Deploy indexes
```

## Git Workflow & Pre-Commit Hooks

**Branch Strategy:**

- `main` - production
- `staging` - staging environment
- Feature branches for development

**Pre-commit Hooks (Husky + lint-staged):**

- Automatically runs Prettier (format)
- Automatically runs ESLint with `--fix` and `--max-warnings=0`
- Only runs on staged files
- If commit fails, fix issues and re-stage

**Commit Requirements:**

- All tests must pass
- No ESLint warnings
- Code must be formatted with Prettier
- TypeScript must compile (`pnpm typecheck`)

## Performance & Optimization

**Bundle Size:** Target ≤200 KB JS bundle
**Lighthouse Score:** Target ≥90

**Optimization Techniques:**

- Batched Firestore writes using `writeBatch()`
- Randomized document IDs to prevent hotspotting
- React.memo for expensive components
- Dynamic imports for large components
- Image optimization via Next.js Image component

## Error Handling & Monitoring

**Error Boundaries:**

- Root error boundary: `app/error.tsx`
- Global error boundary: `app/global-error.tsx`
- Displays user-friendly error messages in both languages

**Logging:**

- Levels: info | warn | error | critical
- Located in: `lib/utils/logger.ts`
- Cloud Logging integration for production

**Network Status:**

- IndexedDB action queue for offline operations
- Status indicators: gray (offline), blue (pending), green (synced)
- NetworkStatusIndicator component in UI

## Reference Documentation

**See these files for comprehensive details:**

- `Tracker_Developer_Guide_v1.0.md` - Full technical specification
- `PROJECT_STRUCTURE.md` - Next.js 15 structure requirements (critical)
- `README.md` - Quick start and environment setup
- `README_SECURITY.md` - Security policies and procedures

**Important Audit Documents:**

- `AUTHORIZATION_AUDIT.md` - Role-based access control details
- `ACCESSIBILITY_SEO_SUMMARY.md` - Accessibility compliance
- `HEBREW_TRANSLATION_AUDIT.md` - i18n implementation details

## Known Issues & Gotchas

1. **Do NOT use /src directory** - Next.js 15 App Router routing breaks with /src structure
2. **Webpack cache issues** - Clear `.next` directory if seeing stale builds
3. **Hydration mismatches** - Ensure language detection is consistent between SSR and CSR
4. **Firebase emulator ports** - Ensure ports 8080, 9099, 4000 are available
5. **Memory issues in tests** - Use `pnpm test:mem` or `pnpm test:light` if tests fail due to memory

## Additional Notes

- **Database Region:** europe-west1 (EU) for Firestore; Auth data in US (identity only)
- **Deployment Platform:** Vercel
- **Backup Strategy:** Daily Firestore export, weekly storage backup
- **Analytics:** Uptime, latency, error rate, tutor fairness metrics
- **Roadmap Phases:** 1) Core (Auth, Rotations), 2) Expansion (Calendar, Portfolio), 3) Intelligence (AI Feedback), 4) Institutional (Multi-site, SSO)
