# User Flow Testing Plan

## Overview

This document maps all critical user journeys in the Tracker application for systematic testing.

---

## 1. AUTHENTICATION FLOWS

### 1.1 Sign Up Flow

**Entry Point:** `/` → redirects to `/auth`

**Steps:**

1. Navigate to auth page
2. Click "Sign Up" tab
3. Fill in registration form:
   - Full Name
   - Email
   - Password (min 8 characters)
   - Select Role (Resident/Tutor/Admin)
   - If Resident: Residency Start Date (must be past date)
4. Click Submit
5. Should redirect to `/awaiting-approval`

**Test Cases:**

- [ ] Valid sign up for Resident (with start date)
- [ ] Valid sign up for Tutor
- [ ] Valid sign up for Admin
- [ ] Email validation (invalid format)
- [ ] Password validation (< 8 characters)
- [ ] Resident without start date (should error)
- [ ] Resident with future start date (should error)
- [ ] Required field validation
- [ ] Duplicate email handling
- [ ] Language toggle (EN/HE) persists

**Expected Errors to Handle:**

- Missing required fields
- Invalid email format
- Password too short
- Future residency date
- Duplicate email
- Firebase errors

---

### 1.2 Sign In Flow

**Entry Point:** `/auth`

**Steps:**

1. Navigate to auth page
2. Stay on "Sign In" tab (default)
3. Enter email
4. Enter password
5. Click Sign In
6. Should redirect to `/awaiting-approval`
7. Once approved, redirects to role-specific dashboard:
   - Resident → `/resident`
   - Tutor → `/tutor`
   - Admin → `/admin`

**Test Cases:**

- [ ] Valid sign in with approved account
- [ ] Valid sign in with pending account (stays on awaiting-approval)
- [ ] Invalid email
- [ ] Wrong password
- [ ] Non-existent account
- [ ] Disabled account handling
- [ ] Auto-redirect based on role
- [ ] Language preference restored from profile

**Expected Errors to Handle:**

- Invalid credentials
- Account not found
- Account pending approval
- Account disabled
- Firebase errors

---

### 1.3 Forgot Password Flow

**Entry Point:** `/auth` → Sign In tab

**Steps:**

1. On Sign In tab
2. Enter email in email field
3. Click "Forgot Password" button
4. Should see success message
5. Check email for password reset link

**Test Cases:**

- [ ] Valid email sends reset link
- [ ] Invalid email shows error
- [ ] Empty email shows error
- [ ] Success message displays
- [ ] Can still sign in after requesting reset

**Expected Errors to Handle:**

- Invalid email
- Email not found
- Firebase email service errors

---

### 1.4 Awaiting Approval Flow

**Entry Point:** `/awaiting-approval`

**Behavior:**

- Auto-polls every 10 seconds to check approval status
- Redirects to role dashboard when approved
- Shows loading message while pending

**Test Cases:**

- [ ] Page displays "awaiting approval" message
- [ ] Unauthenticated users redirect to `/auth`
- [ ] Approved users redirect to correct dashboard
- [ ] Polling mechanism works (10s interval)

---

## 2. RESIDENT USER FLOWS

### 2.1 Dashboard Tab

**Entry Point:** `/resident`

**Features:**

- KPI Cards (statistics)
- Quick Actions
- Pending Tasks List
- Recent Logs
- Announcements

**Test Cases:**

- [ ] Dashboard loads without errors
- [ ] KPI cards display correctly
- [ ] Quick actions are functional
- [ ] Pending tasks appear
- [ ] Recent logs display
- [ ] Can navigate to rotations from quick actions
- [ ] Can focus search from quick actions

---

### 2.2 Rotations Tab

**Entry Point:** `/resident` → Rotations tab

**Features:**

- Search rotations
- Filter by current/all
- View rotation details
- Browse rotation tree
- Select items
- View leaf details
- Log tasks (only for active rotation)

**Test Cases:**

- [ ] Rotation cards display
- [ ] Search filters rotations
- [ ] Scope toggle (current/all) works
- [ ] Can select rotation
- [ ] Rotation browser loads
- [ ] Can select leaf items
- [ ] Leaf details display
- [ ] Can log tasks for active rotation only
- [ ] Cannot log for inactive rotations
- [ ] Status badges show correctly
- [ ] Empty states display when no rotations

**Expected Errors to Handle:**

- Failed to load rotations
- Failed to load rotation nodes
- Failed to log task

---

### 2.3 Reflections Tab

**Entry Point:** `/resident` → Reflections tab

**Test Cases:**

- [ ] Reflections list loads
- [ ] Shows empty state if no reflections
- [ ] Can view reflection details
- [ ] Dates display correctly

---

### 2.4 Progress Tab

**Entry Point:** `/resident` → Progress tab

**Test Cases:**

- [ ] Progress view loads
- [ ] Shows rotation progress
- [ ] Statistics display correctly

---

### 2.5 Approvals Tab

**Entry Point:** `/resident` → Approvals tab

**Test Cases:**

- [ ] Approvals list loads
- [ ] Can view approval status
- [ ] Can navigate to rotation from approval

---

### 2.6 Resources Tab

**Entry Point:** `/resident` → Resources tab

**Test Cases:**

- [ ] Resources display
- [ ] Can navigate to rotation from resource
- [ ] Favorites work
- [ ] Links are functional

---

### 2.7 Morning Meetings Tab

**Entry Point:** `/resident` → Morning Meetings tab

**Features:**

- Today's meetings
- Tomorrow's meetings
- Next 7 days
- Month calendar view

**Test Cases:**

- [ ] Today's meetings display
- [ ] Tomorrow's meetings display
- [ ] Next 7 days display
- [ ] Month calendar loads
- [ ] Empty states show when no meetings
- [ ] Times display in correct locale
- [ ] Loading states appear

---

### 2.8 On-Call Tab

**Entry Point:** `/resident` → On-Call tab

**Features:**

- Today's team
- Next shift card
- Team by date picker
- Timeline/calendar

**Test Cases:**

- [ ] Today panel loads
- [ ] Next shift displays
- [ ] Can select date to view team
- [ ] Timeline/calendar renders
- [ ] User is highlighted correctly

---

### 2.9 Settings Tab

**Entry Point:** `/resident` → Settings tab

**Test Cases:**

- [ ] Settings panel loads
- [ ] Can change language
- [ ] Can update profile
- [ ] Settings persist

---

### 2.10 Bottom Navigation (Mobile)

**Only visible on mobile for residents**

**Test Cases:**

- [ ] Shows on mobile devices only
- [ ] Log Skill button (currently placeholder)
- [ ] Log Case button (currently placeholder)
- [ ] Search button (currently placeholder)
- [ ] On-Call link navigates correctly

---

## 3. TUTOR USER FLOWS

### 3.1 Dashboard Tab

**Entry Point:** `/tutor`

**Features:**

- Pending Approvals (rotation petitions)
- Assigned Residents
- Tutor Todos

**Test Cases:**

- [ ] Dashboard loads
- [ ] Pending approvals display
- [ ] Assigned residents show
- [ ] Todos list appears
- [ ] Can approve/deny petitions
- [ ] Actions show success/error toasts

---

### 3.2 Residents Tab

**Entry Point:** `/tutor` → Residents tab

**Features:**

- View all residents
- Filter by assignment status
- Self-assign to residents
- Unassign from residents
- Approve/deny rotation petitions

**Test Cases:**

- [ ] Residents list loads
- [ ] Can self-assign to unassigned resident
- [ ] Can unassign from resident
- [ ] Can approve petition
- [ ] Can deny petition
- [ ] Success/error messages display
- [ ] List updates after actions

---

### 3.3 Tasks Tab

**Entry Point:** `/tutor` → Tasks tab

**Features:**

- View resident tasks
- Bulk approve tasks
- Bulk reject tasks
- Filter by status

**Test Cases:**

- [ ] Tasks list loads
- [ ] Can select multiple tasks
- [ ] Bulk approve works
- [ ] Bulk reject works
- [ ] Success/error toasts show
- [ ] List refreshes after action
- [ ] Empty state when no tasks

---

### 3.4 Rotations Tab

**Entry Point:** `/tutor` → Rotations tab

**Features:**

- View rotations tutor owns/manages
- See resident assignments per rotation
- View rotation petitions

**Test Cases:**

- [ ] Rotations display
- [ ] Shows only owned rotations
- [ ] Assignments display correctly
- [ ] Petitions show

---

### 3.5 Reflections Tab

**Entry Point:** `/tutor` → Reflections tab

**Test Cases:**

- [ ] Reflections list loads
- [ ] Shows tutor's own reflections
- [ ] Empty state displays

---

### 3.6 Morning Meetings Tab

**Entry Point:** `/tutor` → Morning Meetings tab

**Test Cases:**

- [ ] Same as resident flow (sections 2.7)
- [ ] All views load correctly

---

### 3.7 On-Call Tab

**Entry Point:** `/tutor` → On-Call tab

**Test Cases:**

- [ ] Same as resident flow (section 2.8)
- [ ] All views load correctly

---

### 3.8 Settings Tab

**Entry Point:** `/tutor` → Settings tab

**Test Cases:**

- [ ] Settings panel loads
- [ ] Can change preferences
- [ ] Changes persist

---

## 4. ADMIN USER FLOWS

### 4.1 Overview Tab

**Entry Point:** `/admin`

**Features:**

- Rotation petitions table
- KPI Cards
- Residents by rotation
- Unassigned queues
- Tutor load table

**Test Cases:**

- [ ] Overview loads
- [ ] Petitions table displays
- [ ] KPIs show correctly
- [ ] Residents by rotation chart
- [ ] Unassigned queues visible
- [ ] Tutor load shows

---

### 4.2 Users Tab (Residents)

**Entry Point:** `/admin` → Users tab

**Features:**

- Search users
- Filter by role (resident/tutor/admin)
- Filter by status (pending/active/disabled)
- Sort by role/status
- Bulk selection
- Approve users
- Disable users
- Change user roles
- Pagination

**Test Cases:**

- [ ] Users table loads
- [ ] Search filters correctly
- [ ] Role filter works
- [ ] Status filter works
- [ ] Sort by role (asc/desc)
- [ ] Sort by status (asc/desc)
- [ ] Can select all users
- [ ] Can select individual users
- [ ] Click row opens user drawer
- [ ] Approve action works
- [ ] Disable action works
- [ ] Change role works
- [ ] Confirmation dialogs appear
- [ ] Success toasts show
- [ ] Undo functionality works
- [ ] Pagination (Next button) works
- [ ] Table density toggle (normal/compact)
- [ ] Error handling for failed operations

**Expected Errors to Handle:**

- Failed to load users
- Failed to approve user
- Failed to disable user
- Failed to change role
- Firestore index missing errors

---

### 4.3 Tasks Tab

**Entry Point:** `/admin` → Tasks tab

**Features:**

- View all tasks
- Filter by status
- Bulk approve
- Bulk reject
- Pagination

**Test Cases:**

- [ ] Tasks table loads
- [ ] Status filter works
- [ ] Can select tasks
- [ ] Bulk approve works
- [ ] Bulk reject works
- [ ] Pagination works
- [ ] Empty state shows when no tasks
- [ ] Different filter message in empty state

---

### 4.4 Rotations Tab

**Entry Point:** `/admin` → Rotations tab

**Features:**

- View all rotations
- Create rotations
- Edit rotations
- Manage rotation owners
- Edit rotation tree structure
- Add/edit nodes

**Test Cases:**

- [ ] Rotations panel loads
- [ ] Can create new rotation
- [ ] Can edit rotation
- [ ] Can open rotation editor
- [ ] Rotation owners editor loads
- [ ] Can add/remove owners
- [ ] Rotation tree displays
- [ ] Can add nodes
- [ ] Can edit nodes
- [ ] Can delete nodes
- [ ] Back button returns to list

---

### 4.5 Reflections Tab

**Entry Point:** `/admin` → Reflections tab

**Test Cases:**

- [ ] Reflections admin view loads
- [ ] Can view all reflections
- [ ] Can manage templates

---

### 4.6 Morning Meetings Tab

**Entry Point:** `/admin` → Morning Meetings tab

**Test Cases:**

- [ ] Same as resident flow (section 2.7)
- [ ] All views load correctly

---

### 4.7 On-Call Tab

**Entry Point:** `/admin` → On-Call tab

**Test Cases:**

- [ ] Same as resident flow (section 2.8)
- [ ] All views load correctly

---

### 4.8 Settings Tab

**Entry Point:** `/admin` → Settings tab

**Test Cases:**

- [ ] Settings panel loads
- [ ] Can update admin settings
- [ ] Changes persist

---

## 5. COMMON NAVIGATION FLOWS

### 5.1 Top Bar

**Present on all authenticated pages**

**Features:**

- Logo
- Morning meeting reminder (if applicable)
- Language toggle (EN/HE)
- User avatar and name
- Sign out button

**Test Cases:**

- [ ] Top bar displays on all pages
- [ ] Logo visible
- [ ] Language toggle works
- [ ] Language persists after refresh
- [ ] User name/email displays
- [ ] Sign out works
- [ ] Sign out redirects to /auth
- [ ] Morning meeting reminder shows when applicable

---

### 5.2 Role-Based Access Control

**AuthGate component**

**Test Cases:**

- [ ] Unauthenticated users redirect to /auth
- [ ] Pending users redirect to /awaiting-approval
- [ ] Wrong role users redirect to /auth
- [ ] Correct role users see content
- [ ] Loading state shows while checking
- [ ] Error state shows on failure

---

## 6. EDGE CASES & ERROR SCENARIOS

### 6.1 Network Errors

**Test Cases:**

- [ ] Offline mode behavior
- [ ] Failed API calls show errors (not blank screens)
- [ ] Retry mechanisms for critical operations
- [ ] Graceful degradation

### 6.2 Missing Data

**Test Cases:**

- [ ] Empty states display correctly
- [ ] Null/undefined data handled
- [ ] Missing user profile handled
- [ ] Missing rotations handled
- [ ] Missing assignments handled

### 6.3 Firebase Errors

**Test Cases:**

- [ ] Firebase not configured message
- [ ] Auth errors mapped to user-friendly messages
- [ ] Firestore permission errors
- [ ] Index missing errors

### 6.4 Session Management

**Test Cases:**

- [ ] Session persists across page refresh
- [ ] Session expires gracefully
- [ ] Multiple tabs sync properly
- [ ] Auto-logout on token expiry

---

## 7. BROWSER COMPATIBILITY

**Test in:**

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## 8. RESPONSIVE DESIGN

**Breakpoints to Test:**

- [ ] Mobile (< 768px)
- [ ] Tablet (768px - 1024px)
- [ ] Desktop (> 1024px)

**Mobile-Specific:**

- [ ] Bottom bar shows only for residents on mobile
- [ ] Tab scrolling works horizontally
- [ ] Touch targets are adequate (48px min)

---

## 9. INTERNATIONALIZATION (i18n)

**Test Cases:**

- [ ] Language toggle works (EN/HE)
- [ ] RTL layout for Hebrew
- [ ] LTR layout for English
- [ ] Text direction persists
- [ ] All UI text translates
- [ ] Fallback to English for missing keys
- [ ] Date/time formatting per locale

---

## 10. PERFORMANCE

**Test Cases:**

- [ ] Initial page load < 3s
- [ ] Lazy-loaded components work
- [ ] Suspense boundaries show
- [ ] No unnecessary re-renders
- [ ] Images load optimally
- [ ] Infinite scroll/pagination works smoothly

---

## TESTING CHECKLIST SUMMARY

### Critical Paths (Priority 1)

- [ ] Sign up flow (all roles)
- [ ] Sign in flow
- [ ] Role-based routing after auth
- [ ] Resident: View rotations
- [ ] Resident: Log tasks
- [ ] Tutor: Approve tasks
- [ ] Admin: Approve users
- [ ] Sign out

### Important Paths (Priority 2)

- [ ] Forgot password
- [ ] Awaiting approval polling
- [ ] Resident: View progress
- [ ] Resident: View reflections
- [ ] Tutor: Manage residents
- [ ] Admin: Manage rotations
- [ ] Settings changes

### Nice-to-Have Paths (Priority 3)

- [ ] Morning meetings views
- [ ] On-call schedules
- [ ] Resources/favorites
- [ ] Language switching
- [ ] Mobile bottom navigation

---

## KNOWN ISSUES TO VERIFY

1. **Bottom Bar Links**: Currently pointing to `#` (placeholders)
2. **Firestore Indexes**: May need to be created for all query combinations
3. **Error Messages**: Ensure all Firebase errors are mapped to i18n keys

---

## NEXT STEPS

After completing this flow testing:

1. Browser console health check (#2)
2. Network degradation testing (#3)
3. Fallback improvements (#4)
