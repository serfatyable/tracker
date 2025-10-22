## Tracker — The residency training OS

Tracker is the all‑in‑one platform for residency programs to run rotations, track competency progress, coordinate morning meetings, and plan on‑call schedules — in one simple, mobile‑friendly app.

### Who it’s for
- Program admins who need clarity and control
- Tutors who coach, review, and approve resident work
- Residents who want a clear path and fast logging

### Why teams choose Tracker
- **Clarity**: Real‑time progress by rotation, item, and resident
- **Speed**: One‑tap logging and bulk approvals cut admin time
- **Coordination**: Morning meetings and on‑call schedules, always up to date
- **Confidence**: Role‑based access with approvals keeps quality high
- **Adoption**: Clean, modern UI; English + Hebrew; light/dark themes

---

## What you can do

### Residents — grow faster with clarity
- See your active rotation, required counts, and progress at a glance
- Log activities on rotation items (with count and optional notes)
- Review recent logs, announcements, resources, and reflections
- Track pending/rejected items and jump back to the exact task
- Browse morning meetings and on‑call schedule from your dashboard

### Tutors — coach at scale, approve in seconds
- View assigned residents and their rotations and petitions
- Approve/deny rotation petitions; self‑assign or unassign as tutor
- Moderate resident activity with bulk approve/reject and optional reasons
- Browse rotations and review reflections you authored
- See morning meetings and on‑call schedules in one place

### Admins — keep the program humming
- Overview KPIs, residents by rotation, unassigned queues, tutor load
- Manage users: approve/disable accounts, change roles (resident/tutor/admin)
- Moderate tasks at scale with filters and bulk actions
- Edit rotations/curriculum structure and rotation owners
- Import schedules from Excel for Morning Meetings and On‑Call

---

## How it works
1) **Sign up** at `/auth` and pick your role
2) **Approval**: an admin activates your account
3) **Go**: you’re routed to your dashboard — `/resident`, `/tutor`, or `/admin`

Shared views everyone can use:
- **On‑Call**: `/on-call` — today’s team, next shift, mini calendar
- **Morning Meetings**: `/morning-meetings` — search, filter, and browse
- **Settings**: `/settings` — language (EN/HE), theme, density, notifications

---

## Get started in minutes
- **Admins**: approve your team, import morning meetings/on‑call via Excel, review KPIs
- **Tutors**: review petitions, assign yourself, bulk approve work
- **Residents**: open your rotation and start logging with one tap

Pro tip: Admin dashboard auto‑seeds core rotations and default reflection templates if missing, so you can get value on day one.

---

## Security & privacy
- Firebase Authentication with role‑based access
- Firestore rules scoped to user ownership and reviewer roles
- Settings for language, theme, and notifications stored per user

---

## Quick links
- Auth: `/auth` → `/awaiting-approval`
- Dashboards: `/resident`, `/tutor`, `/admin`
- Global: `/on-call`, `/morning-meetings`, `/settings`
- Admin imports: `/admin/morning-meetings`, `/admin/on-call`
