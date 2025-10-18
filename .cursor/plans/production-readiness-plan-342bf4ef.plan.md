<!-- 342bf4ef-35b0-4d91-8811-f7b6e6eeefb3 43dcde50-dcec-4cf0-aa54-cd83d7491e9f -->
# Production Readiness Plan

## Executive Summary

### Critical Issues Blocking Launch

**CRITICAL - BLOCKS LAUNCH:**

1. **50+ hardcoded English strings** in components that break Hebrew UX
2. **Firebase configuration** error messages not translated
3. **Dark mode uses greyish colors** (gray-800/900) instead of true dark theme
4. **API error messages** in English only
5. **Console.log statements** (56 instances) in production code
6. **Missing environment variable validation** on startup
7. **No error tracking** or monitoring configured

**HIGH - SHOULD FIX:**

1. RTL layout issues in several components
2. Missing loading states in critical flows
3. Date/time formatting not localized consistently
4. Toast notifications not fully translated
5. Form validation messages hardcoded

---

## 1. COMPLETE i18n AUDIT & FIX PLAN

### 1.1 Hardcoded Strings by Component

#### 🔴 CRITICAL: Authentication & Error Pages

**File:** `app/auth/page.tsx`

- Line 172: `"Firebase is not configured. Check your .env.local."` ❌
- Lines 187-194: Logo and brand name hardcoded
- **Fix:** Add `errors.firebaseNotConfigured` to translation files

**File:** `app/error.tsx`

- Line 33: `"Something went wrong"` ❌
- Line 44: `"View error details"` ❌
- Line 53: `"Go Home"` ❌
- Line 57: `"Try Again"` ❌
- **Fix:** Use t('errors.somethingWentWrong'), t('errors.viewDetails'), etc.

**File:** `components/auth/AuthGate.tsx`

- Line 51: `"Failed to load user"` ❌
- **Fix:** Add `errors.failedToLoadUser` translation

#### 🔴 CRITICAL: Navigation & Layout

**File:** `components/layout/Sidebar.tsx`

- Line 35: `"Dashboard"` ❌
- Line 36: `"Reflections"` ❌
- Line 37: `"Auth"` ❌
- Line 48: `"Settings"` ❌
- **Fix:** All navigation labels must use translation keys

**File:** `components/TopBar.tsx`

- Lines 56-61: Language toggle has hardcoded labels and title
- Line 58: `aria-label="Toggle language"` ❌
- Line 59: `title="Language"` ❌
- Line 109: `'User'` as fallback ❌
- **Fix:** Add to translations: `ui.toggleLanguage`, `ui.language`, `ui.user`

#### 🔴 CRITICAL: Admin Components

**File:** `components/admin/overview/KPICards.tsx`

- Lines 34-50: ALL labels hardcoded ❌
  - "Residents"
  - "Active rotations"
  - "Tutors active now"
  - "Unassigned residents"
  - "Tutors with zero load"
- **Fix:** Add `admin.kpi.*` namespace to translations

**File:** `components/admin/rotations/RotationsPanel.tsx`

- Line 190: `"🔧 Maintenance"` ❌
- Line 189: `"Fix duplicates and invalid data"` ❌
- Line 218: `"Please enter a rotation name"` ❌
- Line 238: `"Failed to create rotation: "` ❌
- Line 263: `"Manage owners"` ❌
- **Fix:** Add to `admin.*` translations

#### 🟠 HIGH: Resident Progress Components

**File:** `components/resident/Progress.tsx`

- Line 162: `"pending"` label hardcoded ❌
- Lines 56-58: Progress descriptions hardcoded
- **Fix:** Already mostly translated but missing some edge cases

#### 🟠 HIGH: API Error Messages

**File:** `app/api/morning-meetings/import/route.ts`

- Line 35: `"Empty file"` ❌
- Line 52: `"No valid rows found in file"` ❌
- Line 74: `"Invalid Hebrew day..."` ❌
- Line 80: `"Invalid date..."` ❌
- Line 84: `"Title is required"` ❌
- Line 89: `"Invalid link URL"` ❌
- Line 231: `"Import failed"` ❌
- **Fix:** Return error codes, translate on client side

**File:** `app/api/on-call/import/route.ts`

- Lines 13-18: Error messages ❌
- Lines 137-155: Auth error messages ❌
- Lines 163-171: Validation errors ❌
- **Fix:** Use error codes instead of English strings

### 1.2 Missing Translation Keys

Add to `i18n/en.json` and `i18n/he.json`:

```json
{
  "errors": {
    "firebaseNotConfigured": "Firebase is not configured. Check your environment variables.",
    "firebaseNotConfiguredHint": "See ENV_TEMPLATE.md for setup instructions.",
    "somethingWentWrong": "Something went wrong",
    "viewDetails": "View error details",
    "goHome": "Go Home",
    "tryAgain": "Try Again",
    "failedToLoadUser": "Failed to load user profile",
    "emptyFile": "File is empty",
    "invalidFormat": "Invalid file format",
    "importFailed": "Import failed"
  },
  "ui": {
    "dashboard": "Dashboard",
    "reflections": "Reflections",
    "auth": "Authentication",
    "toggleLanguage": "Toggle language",
    "user": "User",
    "maintenance": "Maintenance",
    "fixData": "Fix duplicates and invalid data"
  },
  "admin": {
    "kpi": {
      "residents": "Residents",
      "activeRotations": "Active rotations",
      "tutorsActive": "Tutors active now",
      "unassignedResidents": "Unassigned residents",
      "tutorsZeroLoad": "Tutors with zero load"
    },
    "rotations": {
      "enterName": "Please enter a rotation name",
      "createFailed": "Failed to create rotation",
      "manageOwners": "Manage owners"
    }
  },
  "api": {
    "errors": {
      "missingAuth": "Missing authentication token",
      "adminRequired": "Admin access required",
      "invalidDate": "Invalid date format",
      "invalidDay": "Invalid day of week",
      "titleRequired": "Title is required",
      "invalidUrl": "Invalid URL format",
      "noData": "No data found in file"
    }
  }
}
```

### 1.3 RTL Layout Issues

**Files with RTL Problems:**

1. `components/TopBar.tsx` - Force LTR on brand, may cause alignment issues
2. `components/resident/Progress.tsx` - Padding calculations need RTL adjustment
3. `components/ui/Toast.tsx` - Icon positioning
4. `components/admin/overview/KPICards.tsx` - Grid layout needs RTL testing

**Fix:** Add RTL-specific styles using `[dir="rtl"]` CSS selectors

### 1.4 Date/Time Formatting

**Issues Found:**

- Dates displayed using `toLocaleDateString()` without locale parameter
- Time formats hardcoded (e.g., "07:10–07:50")
- No timezone display for users

**Fix:** Use `Intl.DateTimeFormat` with current locale:

```typescript
const formatter = new Intl.DateTimeFormat(i18n.language, {
  dateStyle: 'medium',
  timeStyle: 'short'
});
```

---

## 2. DARK MODE COMPLETE OVERHAUL

### 2.1 Current Issues

**Problem:** Dark mode uses `gray-800` and `gray-900` which appear too light/greyish. Need deeper, richer blacks.

**Files Using Wrong Colors:** (138 matches found)

- `components/resident/*` (16 instances)
- `components/admin/*` (11 instances)  
- `components/ui/*` (8 instances)
- `app/error.tsx`, `app/auth/page.tsx`, etc.

### 2.2 Recommended Color Palette

Replace in `app/globals.css`:

```css
@media (prefers-color-scheme: dark) {
  :root {
    /* Backgrounds - True dark, not grey */
    --bg: 8 10 15;              /* Almost black #080A0F */
    --fg: 245 247 250;          /* Bright white for text */
    --surface: 15 18 25;        /* Elevated surfaces #0F1219 */
    --primary: 99 179 237;      /* Brighter blue for dark mode */
    --primary-ink: 8 10 15;     /* Dark text on primary */
    --muted: 148 163 184;       /* Muted text */
    
    /* Additional tokens */
    --surface-elevated: 20 24 32;   /* For cards/modals */
    --surface-depressed: 5 7 12;    /* For input fields */
    --border: 30 35 45;             /* Subtle borders */
    --border-strong: 50 55 65;      /* Visible borders */
  }
  
  /* Body background should be deep */
  body {
    background:
      radial-gradient(1200px 600px at 50% -10%, rgb(0 0 0 / 0.65), transparent 60%),
      linear-gradient(to bottom, rgb(0 0 0 / 0.4), transparent 120px);
  }
}
```

### 2.3 Component-Specific Fixes

**Pattern to Find & Replace:**

| ❌ Current | ✅ Replace With |

|-----------|----------------|

| `dark:bg-gray-900` | `dark:bg-[rgb(var(--surface))]` |

| `dark:bg-gray-800` | `dark:bg-[rgb(var(--surface-elevated))]` |

| `dark:border-gray-800` | `dark:border-[rgb(var(--border))]` |

| `dark:text-gray-300` | `dark:text-[rgb(var(--fg))]` |

| `dark:divide-gray-800` | `dark:divide-[rgb(var(--border))]` |

**Critical Files:**

1. `app/error.tsx` - Line 14, 32, 36, 51
2. `components/ui/Dialog.tsx` - Background overlays
3. `components/ui/Drawer.tsx` - Side panel backgrounds
4. `components/resident/Progress.tsx` - Lines 51, 62, 158, 160
5. `components/ui/Badge.tsx` - Variant styles
6. All card components

### 2.4 Shadow & Elevation

Dark mode shadows need to be lighter:

```css
@media (prefers-color-scheme: dark) {
  :root {
    --elev-1: 0 1px 3px rgba(0, 0, 0, 0.6), 0 1px 2px rgba(255, 255, 255, 0.02);
    --elev-2: 0 4px 12px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(255, 255, 255, 0.03);
  }
}
```

---

## 3. CRITICAL BUG HUNT

### 3.1 Authentication Flow Issues

**Issue:** Circular redirect on auth state change

- **File:** `components/auth/AuthGate.tsx`
- **Problem:** If profile fetch fails, infinite redirects possible
- **Severity:** HIGH
- **Fix:** Add redirect guard with localStorage flag

**Issue:** Password reset doesn't redirect

- **File:** `app/auth/page.tsx` line 125
- **Problem:** User sees success message but stays on page
- **Severity:** MEDIUM
- **Fix:** Redirect to login after 3 seconds

### 3.2 Form Validation

**Issue:** Date validation allows future dates in some forms

- **File:** `app/auth/page.tsx` line 144
- **Severity:** MEDIUM
- **Fix:** Consistent validation across all date inputs

**Issue:** Excel upload doesn't validate file size

- **Files:** `app/api/morning-meetings/import/route.ts`, `app/api/on-call/import/route.ts`
- **Problem:** Large files can crash server
- **Severity:** HIGH
- **Fix:** Add 10MB limit check before parsing

### 3.3 Data Loading Race Conditions

**Issue:** `useCurrentUserProfile` can return stale data

- **File:** Multiple hooks that depend on auth state
- **Severity:** MEDIUM
- **Fix:** Add cache invalidation on auth state change

### 3.4 Error Boundaries

**Issue:** No error boundary around main app content

- **File:** `app/layout.tsx`
- **Severity:** HIGH
- **Fix:** Wrap children in ErrorBoundary component

---

## 4. PERFORMANCE & UX AUDIT

### 4.1 Missing Loading States

**Components without loading indicators:**

1. `components/admin/overview/ResidentsByRotation.tsx`
2. `components/tutor/AssignedResidents.tsx`
3. `components/on-call/TodayPanel.tsx`
4. File upload progress bars missing in import dialogs

**Fix:** Add Skeleton components from `components/dashboard/Skeleton.tsx`

### 4.2 Bundle Size Optimization

**Issue:** XLSX library imported on client side

- **Current:** Webpack fallback in `next.config.js`
- **Fix:** Move all Excel parsing to API routes (already done, but verify)

**Issue:** All i18n loaded upfront

- **Current:** Both en.json and he.json loaded
- **Fix:** Dynamic import based on selected language

### 4.3 Image Optimization

**Issue:** Logo images may not be optimized

- **Files:** `public/logo.png` (multiple sizes)
- **Fix:** Ensure all images are optimized, remove duplicates

### 4.4 Accessibility Issues

**Missing ARIA labels:**

- `components/ui/Dialog.tsx` - Modal dialogs need aria-labelledby
- `components/ui/Drawer.tsx` - Side drawers need role and aria labels
- `components/resident/Progress.tsx` - Progress bars need aria-valuenow

**Keyboard navigation:**

- Toast notifications don't trap focus
- Modal dialogs may not return focus on close

**Color contrast:** Need to verify all text meets WCAG 2.1 AA

- Muted text colors may fail contrast requirements
- Check with dark mode enabled

### 4.5 Meta Tags & SEO

**Missing per-page metadata:**

- All route pages need unique titles
- OpenGraph images not configured
- Meta descriptions generic

**Fix:** Add metadata exports to each page.tsx

---

## 5. SECURITY & DEPLOYMENT CHECKLIST

### 5.1 Exposed Secrets ✅

**Status:** GOOD - No secrets in code, proper .gitignore

### 5.2 Authentication Security

**Issues:**

1. **No rate limiting** on password reset endpoint

   - **Fix:** Add rate limiting middleware or use Firebase Rate Limiting

2. **Session handling** not explicitly configured

   - **Current:** Using Firebase default (1 hour)
   - **Fix:** Configure explicit session duration

3. **No email verification** enforcement

   - **Problem:** Users can sign up without verifying email
   - **Fix:** Add email verification check in AuthGate

### 5.3 Firestore Security Rules ✅

**Status:** MOSTLY GOOD - Rules are well-defined

**Minor issue:** No rate limiting on writes

### 5.4 API Route Security

**Issues:**

1. **No request size limits** explicitly set

   - **Fix:** Add body size limits to API routes

2. **CORS configured** but should validate origins more strictly

   - **File:** `middleware.ts` lines 30-33
   - **Fix:** Use environment variable for allowed origins

3. **No request logging** for security audit trail

   - **Fix:** Add request logging middleware

### 5.5 Input Sanitization

**Issues:**

1. User input not sanitized before Firestore write

   - Rich text fields could contain XSS
   - **Fix:** Sanitize HTML/markdown content

2. URL validation too permissive

   - **File:** `lib/morning-meetings/excel.ts`
   - **Fix:** Whitelist URL schemes (http, https only)

### 5.6 Environment Variables

**Missing validation:**

- No startup check for required env vars
- **Fix:** Add validation in `lib/firebase/client.ts` getFirebaseStatus()

---

## 6. PRODUCTION DEPLOYMENT PLAN

### 6.1 Pre-Deployment Checklist

#### Code Quality

- [ ] All linter errors fixed (`pnpm lint:fix`)
- [ ] All TypeScript errors resolved (`pnpm typecheck`)
- [ ] All tests passing (`pnpm test`)
- [ ] Remove all console.log statements (56 instances)
- [ ] Production build succeeds (`pnpm build`)

#### Translations

- [ ] All hardcoded strings translated
- [ ] Hebrew translations verified by native speaker
- [ ] RTL layout tested thoroughly
- [ ] Date/time formats use proper localization

#### Dark Mode

- [ ] New color palette applied
- [ ] All components tested in dark mode
- [ ] Contrast ratios verified
- [ ] Screenshots taken for comparison

#### Security

- [ ] Environment variables configured in Vercel
- [ ] Firebase rules deployed
- [ ] API rate limiting configured
- [ ] CORS origins restricted to production domain

### 6.2 Vercel Configuration

**Environment Variables to Set:**

```bash
# Firebase Client (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=false

# Firebase Admin (Secret)
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Monitoring (Optional)
NEXT_PUBLIC_SENTRY_DSN=xxx (if using Sentry)
```

**Deployment Settings:**

- Node version: 20.x (set in `package.json` engines)
- Build command: `pnpm build`
- Install command: `pnpm install`
- Framework: Next.js

### 6.3 Firebase Setup

**Deploy Rules and Indexes:**

```bash
firebase use <project-id>
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

**Configure Firebase:**

- Enable Email/Password authentication
- Set up email templates (password reset, verification)
- Configure authorized domains (add your Vercel domain)

### 6.4 Monitoring Setup

**Recommended:** Sentry or similar

1. Add `@sentry/nextjs` package
2. Configure in `sentry.client.config.ts` and `sentry.server.config.ts`
3. Add Sentry DSN to environment variables
4. Test error reporting in staging

**Analytics:**

- Google Analytics 4 (measurement ID in env vars)
- Plausible or similar privacy-friendly alternative

### 6.5 Post-Deployment Verification

**Smoke Tests:**

- [ ] Homepage loads
- [ ] Login/signup works
- [ ] Language toggle works
- [ ] Dark mode toggle works
- [ ] Admin can import data
- [ ] Morning meetings display correctly
- [ ] On-call schedule displays correctly
- [ ] ICS calendar exports work
- [ ] PDF generation works (if applicable)
- [ ] Mobile layout responsive

**Performance Checks:**

- [ ] Lighthouse score > 90 (Performance, Accessibility, Best Practices)
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3s
- [ ] No console errors in production

### 6.6 Rollback Procedure

1. Keep previous Vercel deployment available
2. Document rollback command: `vercel rollback <deployment-url>`
3. Have Firebase rules backup
4. Keep database backup strategy documented

---

## 7. TIMELINE & WORK STREAMS

### Week 1: Critical Fixes (40 hours)

**Stream A - i18n (20h):**

- Add all missing translation keys
- Translate hardcoded strings in components
- Fix API error message system

**Stream B - Dark Mode (12h):**

- Implement new color palette
- Update all components
- Test and screenshot comparison

**Stream C - Security (8h):**

- Add rate limiting
- Sanitize inputs
- Configure CORS properly

### Week 2: Polish & Testing (32 hours)

**Stream A - UX (16h):**

- Add loading states
- Fix RTL layout issues
- Implement error boundaries
- Add accessibility labels

**Stream B - Testing (16h):**

- Manual testing of all flows
- Hebrew/RTL testing
- Dark mode testing
- Mobile testing
- Browser compatibility

### Week 3: Deployment (16 hours)

**Stream A - Prep (8h):**

- Remove console.logs
- Optimize bundle
- Add monitoring
- Configure environments

**Stream B - Deploy (8h):**

- Staging deployment
- Final smoke tests
- Production deployment
- Post-deploy verification

**Total Estimated Time:** 88 hours (~2.5 weeks with one developer)

---

## 8. GO / NO-GO CRITERIA

### MUST HAVE (Blocks Launch)

- ✅ All hardcoded strings translated
- ✅ Dark mode visually correct (true dark, not grey)
- ✅ Authentication flow works reliably
- ✅ No console.log in production
- ✅ Firebase configured correctly
- ✅ All critical bugs fixed

### SHOULD HAVE (Launch with notes)

- ⚠️ All RTL layouts perfect
- ⚠️ All loading states present
- ⚠️ WCAG AA compliance verified
- ⚠️ Monitoring configured

### NICE TO HAVE (Post-launch)

- Bundle size < 500KB
- Lighthouse score 95+
- Email verification enforced
- Advanced analytics

---

## Priority Matrix

| Priority | Category | Tasks | Est. Hours |

|----------|----------|-------|------------|

| 🔴 CRITICAL | i18n | Translate all strings | 20 |

| 🔴 CRITICAL | Dark Mode | Fix color palette | 12 |

| 🔴 CRITICAL | Security | Rate limiting, sanitization | 8 |

| 🟠 HIGH | UX | Loading states, errors | 16 |

| 🟠 HIGH | Testing | Full regression | 16 |

| 🟡 MEDIUM | SEO | Meta tags, sitemap | 4 |

| 🟢 LOW | Optimization | Bundle size | 4 |

**Total:** 80 hours minimum for production readiness

### To-dos

- [ ] Add all missing translation keys to i18n/en.json and i18n/he.json (50+ keys identified)
- [ ] Replace all hardcoded strings with t() calls in auth, navigation, admin, and error components
- [ ] Convert API error messages to error codes, translate on client side
- [ ] Fix RTL layout issues in Progress, TopBar, Toast, and KPICards components
- [ ] Implement new dark color palette in globals.css with true blacks (--bg: 8 10 15)
- [ ] Replace gray-800/900 with CSS variables in 138 instances across all components
- [ ] Update shadow and elevation tokens for dark mode visibility
- [ ] Add rate limiting to API routes, especially password reset and imports
- [ ] Sanitize HTML/markdown content and validate URLs strictly
- [ ] Restrict CORS origins to environment variable whitelist in middleware.ts
- [ ] Fix infinite redirect bug in AuthGate.tsx with localStorage guard
- [ ] Add 10MB file size validation to Excel upload API routes
- [ ] Add ErrorBoundary wrapper in app/layout.tsx around children
- [ ] Add Skeleton loading states to ResidentsByRotation, AssignedResidents, TodayPanel, and import dialogs
- [ ] Add ARIA labels to Dialog, Drawer, Toast, and Progress components
- [ ] Add unique metadata exports to all page.tsx files for SEO
- [ ] Remove all 56 console.log statements from production code
- [ ] Add startup validation for required environment variables
- [ ] Configure all environment variables in Vercel dashboard
- [ ] Deploy firestore.rules and indexes to production Firebase
- [ ] Set up Sentry or error tracking service with production DSN
- [ ] Execute full smoke test suite: auth, data import, displays, language toggle, dark mode
- [ ] Test all pages and components in Hebrew RTL mode with screenshots
- [ ] Run Lighthouse and WAVE accessibility audit, fix WCAG AA violations