<!-- 7ad5f82f-2cb4-421d-aaf0-ddd6acc1590f 088cd11c-ad01-44ee-b04c-1afc36d23950 -->

# Checkpoint Verification Plan

## Goals

- Confirm consolidated structure, dependencies, environment, and minimal build run.
- Surface any issues before implementing more features.

## Steps

### 1) Verify structure

- Ensure only one app at `src/app/` with routes: `auth`, `awaiting-approval`, `resident`, `tutor`, `admin`.
- Ensure libs at `src/lib/{firebase,i18n}` and types at `src/types`.
- Ensure i18n files at `i18n/en.json`, `i18n/he.json`.

### 2) Dependencies

- Use chosen package manager (npm or pnpm) at repo root.
- Install deps:
- npm: `npm install`
- pnpm: `pnpm install`

### 3) Environment setup

- Copy `.env.example` → `.env.local` and fill keys.
- Sanity check: no missing `NEXT_PUBLIC_*` keys.

### 4) Typecheck + Lint (as available)

- Type check: `npx tsc --noEmit`
- (Optional) Lint if ESLint is configured: `npx eslint .`

### 5) Build/Dev smoke

- One of:
- Build: `npx next build` (preferred quick verification)
- Or Dev: `npx next dev` and open `/` to confirm redirect → `/auth` and page loads

### 6) Firebase local sanity

- If Firebase CLI is installed and configured:
- Start emulators (optional): `firebase emulators:start`
- Deploy rules (optional): `firebase deploy --only firestore:rules`

## Acceptance criteria

- Single clean structure under `src/` and `i18n/`.
- Dependencies install successfully.
- Typecheck passes (or issues are listed for fix).
- Build succeeds (or dev server runs without critical errors).
- Firestore rules are present and deployable later.

### To-dos

- [x] Confirm single app structure and i18n files exist
- [x] Install dependencies with selected package manager
- [x] Copy .env.example to .env.local and fill keys
- [x] Run TypeScript typecheck with no emit
- [x] Run Next.js build or dev and load /auth
- [ ] Optionally run emulators or deploy rules for validation
