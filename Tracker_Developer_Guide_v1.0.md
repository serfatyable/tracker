# Tracker for Anesthesiologists – Developer Guide v1.0

**Status:** Final and Canonical Version  
**Date:** October 2025

---

## Preface

Tracker v1.0 is the definitive, compliance-ready developer guide for the anesthesiology residency tracker.  
It merges all technical, architectural, and compliance refinements from previous drafts.  
This version is the authoritative single source of truth for development, deployment, and maintenance.

---

## 1. Overview

Tracker is a bilingual, Firebase-based web platform for managing anesthesiology residency training.  
It connects **residents**, **tutors**, and **admins** to streamline learning task tracking, feedback, and analytics.

**Core principles**

- No patient data or hospital integration.
- Modular, scalable, secure.
- Fully bilingual (English ↔ Hebrew).
- Accessibility compliant (WCAG AA).

---

## 2. Core Roles

**Residents**

- Record skills, knowledge, and guidance progress.
- Log cases and submit required tasks.
- View feedback and performance statistics.

**Tutors**

- Approve or reject resident tasks with structured feedback.
- Log teaching cases and monitor progress.
- Participate in fairness analytics.

**Admins**

- Manage rotations, users, and system configuration.
- Import/export rotations and templates.
- Monitor quotas, performance, and compliance.

---

## 3. Authentication and Access

Unified sign-in and sign-up page:

- Fields: Full Name, Email, Password, Role (Resident / Tutor / Admin), Language (EN/HE); Residency Start Date (Residents only).
- “Show Password” toggle.
- Language preference stored per user.
- Role activation requires admin approval.
- Routing:
  - Resident → Dashboard
  - Tutor → Tutor Dashboard
  - Admin → Admin Dashboard

**Residency Start Date (Residents only)**
Required only when role = resident; hidden and not stored for tutors/admins.  
Must be a past date (no future); stored as ISO `YYYY-MM-DD`.  
Used for analytics (time-in-program) and future rotation logic.  
users/{uid}.status defaults to `pending` at signup; pending users are routed to `/awaiting-approval` until an admin approves.

**Error Handling and Language Persistence**

- **Auth Error UX:** Centralized mapping of Firebase Auth error codes to i18n keys. On **sign-in**, all credential-related errors (invalid-credential, user-not-found, wrong-password) are merged into a single generic error to avoid revealing whether an account exists. On **sign-up**, more specific messages are displayed (email already in use, weak password, etc.). The error mapper returns i18n keys under `errors.auth.*` for consistency.

- **Language Persistence:** On sign-in, read `users/{uid}.settings.language` (default `"en"`). Immediately update i18n language and `<html lang/dir>` attributes to apply RTL if Hebrew. Persist this value in `localStorage`. When the user explicitly changes their language in Settings, update Firestore (`users/{uid}.settings.language`) and `localStorage`. The app defaults to English if the user is signed out or no preference is stored.

---

## 4. User Interfaces

Tabs: Dashboard | Pending Tasks | Rotations | Courses | Simulations | Cases | Favorites | Stats | Settings

**Mobile Navigation:**  
Primary tabs accessed through a hamburger menu.  
Bottom bar (persistent): Log Case | Log Skill | Search.

---

## 5. Core Rotations

1. ICU
2. OR
3. Block Room
4. PACU
5. Obstetrics
6. Cardiothoracic
7. Neurosurgery
8. Pediatrics
9. Pain Medicine

Each rotation contains **Skills**, **Knowledge**, and **Guidance**, divided hierarchically into topics and subtopics.

---

## 6. Tutor Dashboard

- Resident assignments overview.
- Task approval with comments and scores.
- Tutor performance metrics and fairness analytics.

---

## 7. Admin Dashboard

- Global view of rotations and users.
- Rotation Management (CRUD, import/export templates).
- System Health Dashboard.
- Budgets → operational quotas (Firestore reads/writes, storage).

---

## 8. Local Development Setup

**Requirements**

- Node.js ≥ 20
- Firebase CLI
- Vercel CLI (optional)

**Setup**

```bash
git clone <repo_url>
cd tracker
pnpm install
firebase emulators:start
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 9. System Architecture & Environment Configuration

**Frontend:** Next.js (TypeScript) + TailwindCSS + Headless UI  
**Backend:** Firebase (Firestore, Auth, Storage, Functions)  
**Deployment:** Vercel  
**Database region:** europe-west1 (EU)  
**Auth data:** US (identity only)

**Environment Variables**

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_APP_ENV=staging|production
```

- Local: `.env.local` (ignored by Git)
- Staging/Production: Vercel Environment Variables

---

## 10. Data Model Summary

| Collection    | Description                         |
| ------------- | ----------------------------------- |
| users         | All registered users                |
| rotations     | Rotation definitions                |
| rotationItems | Topics, subtopics, and tasks        |
| tasks         | Logged activities per user          |
| cases         | Recorded clinical/educational cases |
| auditLog      | System events                       |

### Example Schemas

**users/{uid}** (Resident)

```json
{
  "fullName": "Daniel Cohen",
  "role": "resident",
  "email": "daniel@example.com",
  "status": "pending",
  "settings": { "language": "en", "theme": "dark" },
  "residencyStartDate": "2024-11-01",
  "assignments": { "tutorIds": ["t123"], "rotationIds": ["icu2025"] },
  "createdAt": "serverTimestamp"
}
```

**users/{uid}** (Tutor/Admin)

```json
{
  "fullName": "Dana Levi",
  "role": "tutor",
  "email": "dana@example.com",
  "status": "approved",
  "settings": { "language": "he", "theme": "light" },
  "assignments": { "residentIds": ["u123"] },
  "createdAt": "serverTimestamp"
}
```

**tasks/{taskId}**

```json
{
  "userId": "u123",
  "rotationId": "icu2025",
  "itemId": "skill_airway",
  "count": 3,
  "requiredCount": 5,
  "status": "pending",
  "feedback": [{ "by": "t123", "text": "Good technique" }]
}
```

---

## 11. Import / Export

- Download template → Fill → Upload.
- Sandbox validation with changelog required.
- Rollback and version control supported.

---

## 12. Notifications & Calendar

- Email and in-app notifications.
- ICS export with timezone awareness.

---

## 13. Internationalization (i18n)

Implemented with **react-i18next**.

**Example Files**

```json
// en.json
{ "dashboard": "Dashboard", "skills": "Skills" }
```

```json
// he.json
{ "dashboard": "לוח בקרה", "skills": "מיומנות" }
```

RTL automatically applied when Hebrew selected.

**SSR/CSR Synchronization:**  
To prevent hydration mismatches, determine `<html lang>` and `dir` at render based on a cookie or client effect that reads the saved language preference. Hebrew enforces `dir="rtl"`. Numerical values within Hebrew text remain left-to-right using CSS (`unicode-bidi` and `direction`).

---

## 14. Security

- Firestore rules with least privilege.
- Enforce role-conditional fields: only residents may have/write 'residencyStartDate'; tutors/admins must not store this field. Users can write only allowed fields on their own doc.
- Input sanitized using **DOMPurify**.
- CSP headers applied globally.
- IAM roles rotated every 90 days.

**GDPR Note:**  
Firebase Auth stores identity info in the U.S. If strict EU compliance is required, migrate to a regional IdP (Auth0 EU, Azure AD B2C).

---

## 15. Backups & Recovery

Daily Firestore export, weekly storage backup.  
Automated via Cloud Function:

```js
exports.scheduledBackup = functions.pubsub
  .schedule('0 2 * * *')
  .timeZone('Asia/Jerusalem')
  .onRun(() => backupFirestore());
```

Quarterly restore drills ensure RTO ≤1h and RPO ≤24h.

---

## 16. Analytics & Fairness Metrics

- Uptime, latency, error %, quotas.
- Fairness metrics:
  - Avg tutor approval delay
  - Feedback length average
  - Approval variance per tutor

---

## 17. Offline Support

- IndexedDB action queue with retries.
- Status indicators: gray (offline), blue (pending), green (synced).

---

## 18. Performance & Optimization

- JS bundle ≤200 KB, Lighthouse ≥90.
- Batched writes:

```ts
const batch = writeBatch(db);
batch.set(ref1, data);
batch.update(ref2, data2);
await batch.commit();
```

- Randomized doc IDs prevent Firestore hotspotting (avoids write clustering).

---

## 19. Testing

- **Unit:** Components and Firebase hooks
- **Integration:** Multi-role approval flow
- **E2E:** Cypress “Resident → Tutor → Admin” scenario
- **Accessibility:** axe-core + Lighthouse
- Coverage ≥80%

---

## 20. Error Handling & Monitoring

- ErrorBoundary in React.
- Log levels: info | warn | error | critical.
- Cloud Logging integration.
- Alerts:
  - 1% → warning
  - 3% → email alert
  - 5% → degradation notice

---

## 21. Developer Workflow

- Git Flow: main | staging | feature
- Pre-commit: ESLint + Prettier + Husky
- Dependabot for vulnerability scans.
- PR requires tests and reviews.

---

## 22. Service Worker & Transactions

- Stale-while-revalidate cache pattern.
- Prompt user to refresh on new release.
- Firestore `runTransaction()` for atomic counters.

---

## 23. Troubleshooting

| Issue           | Resolution                     |
| --------------- | ------------------------------ |
| Quota exceeded  | Batch writes, cache data       |
| Hydration error | Remove client-only code in SSR |
| Emulator crash  | Clear `.firebase` cache        |
| CI timeout      | Rerun with `--debug`           |

---

## 24. Compliance

- TailwindCSS + Headless UI only.
- DOMPurify for sanitization.
- GDPR-consistent note on data residency.
- Accessibility: axe-core + WAVE validation.

---

## 25. Roadmap

| Phase | Focus         | Deliverables         |
| ----- | ------------- | -------------------- |
| 1     | Core          | Auth, rotations, RTL |
| 2     | Expansion     | Calendar, portfolio  |
| 3     | Intelligence  | AI feedback          |
| 4     | Institutional | Multi-site, SSO      |

---

## 26. Legacy Compatibility & Version Upgrades

Migrating from prior drafts:

- `intern` → `resident`
- Added `requiredCount`
- Unified rotation collections
- Added stableItemId to imports
- Updated Firestore indexes accordingly

---

## Hebrew–English Summary Table

| English   | Hebrew   |
| --------- | -------- |
| Resident  | מתמחה    |
| Tutor     | מדריך    |
| Admin     | מנהל     |
| Rotation  | מחזור    |
| Skill     | מיומנות  |
| Guidance  | הדרכה    |
| Knowledge | ידע      |
| Feedback  | משוב     |
| Dashboard | לוח בקרה |
| Settings  | הגדרות   |

---

**End of Tracker Developer Guide v1.0**  
This is the official and final technical reference for the Tracker application.

### Firestore Deploy Cheatsheet

```bash
firebase login
firebase use YOUR_PROJECT_ID
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```
