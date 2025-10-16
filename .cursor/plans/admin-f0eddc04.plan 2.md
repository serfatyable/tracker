<!-- f0eddc04-bf7c-40a8-a30b-d714ee2800da 3408f643-b11b-4203-8f17-8778eda8dc07 -->

# Admin Demo (Seeded Firebase + Persona Switcher)

## Overview

Set up a demo/staging experience backed by a separate Firebase demo project. Populate realistic data via a seed script. Allow edits but reset daily. Provide a persona switcher to quickly view Admin/Tutor/Resident tabs without real credentials.

## Demo mode toggle

- Add `NEXT_PUBLIC_DEMO_MODE=true` to staging env.
- Use separate Firebase config for the demo project via env (`FIREBASE_PROJECT_ID_DEMO`, keys).
- In `lib/firebase/client.ts`, pick demo config when `NEXT_PUBLIC_DEMO_MODE` is true.

## Auth and persona switching

- Keep auth simple: anonymous sign-in when demo mode is enabled.
- In `components/auth/AuthGate.tsx`, if demo mode → auto sign-in anonymously and bypass email/password.
- Add `components/DevDiagnosticsBar.tsx` (or `components/TopBar.tsx`) persona switcher UI with three personas: Admin, Tutor, Resident.
- On persona change, store selection in `localStorage` and provide via a small `DemoProvider` context.
- Adjust `useCurrentUserProfile.ts` to, in demo mode, resolve the selected persona to a seeded user document (by known UID) and return that profile.

## Data model and fixtures

- Author curated fixtures to ensure each tab looks informative:
- Admin overview: KPIs, petitions with multiple states, tutor load distribution, unassigned queues.
- Rotations: owners, assignments, coverage across months.
- Reflections: templates, submissions, pending/approved states.
- Tutor: assigned residents, approvals, tasks due soon.
- Resident: pending tasks, progress trends, recent logs.
- Store fixtures as JSON under `lib/mocks/demo/` (e.g., `users.json`, `rotations.json`, `assignments.json`, `tasks.json`, `reflections.json`, `petitions.json`).

## Seeding strategy

- Create `scripts/seed-demo.ts` using the Admin SDK (`lib/firebase/admin.ts`).
- Seed both: Firebase Emulator (local) and the demo Firebase project (staging), depending on env.
- Idempotent: clear demo collections before insert; stable IDs for key docs (personas) so links stay consistent.
- Provide `pnpm demo:seed` for local and `pnpm demo:seed:staging` for remote.

## Reset strategy (editable but resettable)

- Add a small Cloud Function or GitHub Action to run `seed-demo` daily (e.g., 3am) on the demo project.
- Also expose a protected HTTP-triggered function to trigger a manual reseed before meetings.

## Staging deployment

- Create a dedicated Firebase project: “tracker-demo”.
- Add staging env file with demo Firebase credentials and `NEXT_PUBLIC_DEMO_MODE=true`.
- Deploy as a temporary staging URL (e.g., Vercel preview linked to demo env).

## Firestore rules (demo project)

- Keep production rules strict.
- For the demo project only, deploy a relaxed variant allowing reads to all and writes to authenticated users (anonymous allowed). Place variant as `firestore.rules.demo` and use CI/CD to deploy the right file per project.

## Minimal code edits

- `lib/firebase/client.ts`: choose demo Firebase config when demo mode.
- `lib/firebase/auth.ts`: add anonymous sign-in util for demo.
- `components/auth/AuthGate.tsx`: bypass login when demo mode; ensure user is signed in anonymously.
- `components/TopBar.tsx` (or `components/DevDiagnosticsBar.tsx`): add PersonaSwitcher (Admin/Tutor/Resident) when demo mode.
- `lib/hooks/useCurrentUserProfile.ts`: in demo mode, map persona → seeded UID → fetch that profile.
- Optional no-op wrappers: if any write paths need guarding, wrap them to still call Firestore but catch/notify in demo mode.

## Developer ergonomics

- Ribbon/badge: show “Demo Mode” in the top bar.
- Tooltip helpers on key empty states explaining what the tab shows (only in demo mode).
- One-page demo guide in `README.md` with the 3-step runbook.

## Commands and env

- Local: set `NEXT_PUBLIC_DEMO_MODE=true` and run `pnpm demo:seed` (Emulator) → `pnpm dev`.
- Staging: deploy with demo env vars and run `pnpm demo:seed:staging` once; schedule daily reseed.

### To-dos

- [ ] Add demo mode flag and demo Firebase config selection
- [ ] Implement anonymous sign-in flow under demo mode
- [ ] Add persona switcher UI to top bar/diagnostics
- [ ] Map personas to seeded demo user profiles in hook
- [ ] Create curated demo fixtures (users, rotations, tasks, reflections, petitions)
- [ ] Write idempotent seed script for emulator and demo project
- [ ] Set up scheduled reseed for demo project
- [ ] Create relaxed Firestore rules variant for demo project
- [ ] Provision demo Firebase project and staging deployment env vars
- [ ] Write brief demo runbook in README
