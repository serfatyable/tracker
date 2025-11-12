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

## Telemetry baseline — 2025-11-12

- Web vitals ingestion enabled (`app/reportWebVitals.ts` → `app/api/telemetry/web-vitals/route.ts`) with Sentry tagging via `lib/telemetry/register.ts`.
- Baseline collection command: `pnpm perf:lighthouse` (3-run desktop profile, outputs to `./.lighthouse-baseline`).
- Metrics snapshot endpoint: `GET /api/telemetry/web-vitals` (mirrors in-memory aggregates for DevDiagnostics / dashboards).
- Sampling defaults: 30% in production (override `NEXT_PUBLIC_WEB_VITAL_SAMPLE_RATE`), 100% in local/dev for richer traces.
- Cross-reference: `ACCESSIBILITY_AUDIT_COLORS.md` still flags widespread `opacity-70` usage (see resident/tutor bullets), and `NETWORK_TESTING_PLAN.md` scenarios map to new telemetry tags for slow/offline cases.

## Known UX / behavioural issues (2025-11-12)

### Resident

- Quick actions (`app/resident/page.tsx`, `components/resident/QuickActions.tsx`) use no-op callbacks, so buttons never navigate or focus search. Also duplicates `onGoRotations` handler across three buttons instead of wiring real flows.
- `PendingTasksList` receives `nodesById` built with `any` casts and lacks empty-state copy alignment with design spec (no deep link to `/resident?tab=progress`).
- `LargeTitleHeader` is rendered without a `rightSlot`, leaving command palette shortcuts and Mine/Status chips inaccessible.

### Tutor

- `app/tutor/page.tsx` aliases `useMemo` as `_useMemo` without usage; Suspense boundaries render skeletons but layout still shifts because containers lack fixed heights.
- `PendingApprovals` drawer badges desynchronise from `useUserTasks` data; approvals remain highlighted after action until full reload.
- Meetings quick actions chips absent from `components/tutor/tabs/RotationsTab`, breaking parity with stored UI spec.

### Admin

- `components/admin/rotations/RotationTree.tsx` (1560+ LOC) resets expansion state on each `refresh`, collapsing tree when Firestore updates or when nodes mutate.
- Drag & drop preview lacks virtualization; large datasets (>400 nodes) incur 1.5s re-render jank on MacBook M1 (profiling via React DevTools timeline).
- Bulk mode toasts and errors use generic strings; no actionable recovery steps surfaced on failure.

### To-dos

- [x] Confirm single app structure and i18n files exist
- [x] Install dependencies with selected package manager
- [x] Copy .env.example to .env.local and fill keys
- [x] Run TypeScript typecheck with no emit
- [x] Run Next.js build or dev and load /auth
- [ ] Optionally run emulators or deploy rules for validation
