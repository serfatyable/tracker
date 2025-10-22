## Tracker — App overview and features by user role

This app helps a residency program manage rotations, track competency tasks, coordinate morning meetings, and plan on‑call schedules. Users sign in, get approved by an admin, and then access a role‑specific dashboard with tools for their work.

### Roles
- **Resident**: logs activities on rotation items, tracks progress, views resources, submits work for approval.
- **Tutor**: supervises residents, reviews/approves work, handles rotation petitions, manages assignments.
- **Admin**: manages users and roles, moderates tasks, edits rotations/curriculum, and imports schedules.

### Account lifecycle
- Sign in/up at `/auth`
- New users wait at `/awaiting-approval` until an admin sets status to active
- After approval: Residents → `/resident`, Tutors → `/tutor`, Admins → `/admin`
- Disabled users lose access until re‑enabled by an admin

---

## Shared features (all roles)
- **On‑Call schedule (read‑only)**
  - View today’s assignments, your next shift, team on selected date, and a mini calendar
  - Locations:
    - Global: `/on-call`
    - Dashboard tabs: Resident › On Call, Tutor › On Call, Admin › On Call
- **Morning Meetings (read‑only)**
  - Browse/search upcoming meetings by month, with lecturers/moderators/organizers and notes
  - Locations:
    - Global: `/morning-meetings`
    - Dashboard tabs: Resident › Morning, Tutor › Morning, Admin › Morning
- **Settings** (`/settings`)
  - Language: English/עברית
  - Theme: light / dark / system
  - Table density preference
  - Notifications: in‑app and email options
  - Morning Meetings: opt‑in lecturer reminder

---

## Resident features (at `/resident`)
- **Dashboard**
  - KPIs for progress, quick actions (favorites), pending tasks list, recent logs, announcements
- **Rotations**
  - Browse rotations; search by name; switch view: Dashboard / Tree Map / Browse
  - Select a rotation item (leaf) to see requirements, notes, resources, links
  - **Log activity** on items in your active rotation (count + optional note); see recent logs and progress vs required
- **Reflections**
  - View your submitted reflections
- **Progress**
  - Enhanced progress view across rotations/items
- **Approvals**
  - See your tasks awaiting approval or rejected; filter by status and by category (knowledge/skills/guidance)
- **Resources**
  - Rotation‑linked learning resources, quick open into Rotations
- **Morning** (read‑only) and **On Call** (read‑only) tabs as described above
- **Settings** as described above

Notes:
- Activity logging is available only for items within your current active rotation.

---

## Tutor features (at `/tutor`)
- **Dashboard**
  - Pending rotation petitions (approve/deny)
  - Assigned residents overview and rotation ownership context
  - Tutor to‑dos
- **Residents**
  - See residents, their petitions, assignments, and rotations
  - Actions: approve petition, deny petition, self‑assign as tutor, unassign
- **Tasks (moderation)**
  - Review resident task logs grouped by resident
  - Bulk approve or reject selected tasks; optional rejection reason
- **Rotations**
  - Browse rotations and view petition context
- **Reflections**
  - View reflections you authored
- **Morning** (read‑only) and **On Call** (read‑only) tabs as described above
- **Settings** as described above

---

## Admin features (at `/admin`)
- **Overview dashboard**
  - KPIs; residents by rotation; unassigned queues; tutor load table
  - Rotation petitions table with filters and bulk approve/deny
- **Users** (user management)
  - Search users; filter by role/status; sort by role or status; pagination
  - Open a user to: Approve (set active), Disable, or Change role (resident/tutor/admin)
- **Tasks (moderation)**
  - List tasks across users; filter by status; bulk approve/reject; pagination
- **Rotations (curriculum)**
  - Browse rotations; open editor for a rotation
  - Edit rotation structure (tree) and manage rotation owners
- **Reflections (admin)**
  - Manage reflections data (view tabs dedicated for admin)
- **Morning Meetings**
  - Read‑only view in the tab, plus Excel import flow at `/admin/morning-meetings`
- **On‑Call Schedule**
  - Read‑only view in the tab, plus Excel import flow at `/admin/on-call`
- **Settings** as described above

Notes:
- When an admin enters the dashboard, core rotations and default reflection templates may auto‑seed if missing.

---

## Navigation quick reference
- Auth: `/auth` → `/awaiting-approval`
- Dashboards: `/resident`, `/tutor`, `/admin`
- Global views: `/on-call`, `/morning-meetings`, `/settings`
- Admin importers: `/admin/morning-meetings`, `/admin/on-call`

## Glossary
- **Rotation**: A curricular block containing categories and items (leaves) with required counts.
- **Task**: A resident‑logged activity on a rotation item; reviewed and approved/rejected by tutors/admins.
- **Petition**: Resident request to activate or finish a rotation.
