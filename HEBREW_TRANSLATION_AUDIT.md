# Hebrew Translation Audit Report

**Date:** October 14, 2025  
**Status:** Pre-Implementation Audit

## Executive Summary

This audit identifies all hardcoded English text in the application that needs Hebrew translation. The findings are organized by component/page and include proposed Hebrew translations.

---

## 🔴 HIGH PRIORITY - User-Facing UI Text

### 1. Top Navigation & Layout

#### **File:** `components/TopBar.tsx`

| Line | English Text | Proposed Hebrew | Context        |
| ---- | ------------ | --------------- | -------------- |
| 104  | "Sign out"   | "התנתק"         | Desktop button |
| 105  | "Out"        | "יציאה"         | Mobile button  |

**Translation Key:** `auth.signOut` (already exists, needs to be used)

---

#### **File:** `components/layout/BottomBar.tsx`

| Line | English Text | Proposed Hebrew | Context                  |
| ---- | ------------ | --------------- | ------------------------ |
| 27   | "Log Skill"  | "רשום מיומנות"  | Bottom navigation button |
| 35   | "Log Case"   | "רשום מקרה"     | Bottom navigation button |
| 39   | "Search"     | "חיפוש"         | Bottom navigation button |

**New Translation Keys Needed:**

```json
"bottomNav": {
  "logSkill": "Log Skill",
  "logCase": "Log Case",
  "search": "Search"
}
```

---

### 2. Admin Pages

#### **File:** `app/admin/page.tsx`

| Line | English Text    | Proposed Hebrew | Context        |
| ---- | --------------- | --------------- | -------------- |
| 221  | "Disabled user" | "משתמש הושבת"   | Toast message  |
| 894  | "Timeline"      | "ציר זמן"       | Section header |

**Note:** Line 894 should use `t('ui.timeline')` which already exists.

---

#### **File:** `app/admin/on-call/page.tsx`

| Line | English Text                                                      | Proposed Hebrew                                          | Context                                   |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------------- |
| 126  | "CSV with Hebrew headers; one row per date. Paste content below." | "CSV עם כותרות בעברית; שורה אחת לתאריך. הדבק תוכן למטה." | Instruction text                          |
| 153  | "Preview"                                                         | "תצוגה מקדימה"                                           | Section header                            |
| 154  | "Assignments parsed:"                                             | "משימות שנותחו:"                                         | Preview label                             |
| 157  | "Dry run (preview)"                                               | "הרצה לדוגמה (תצוגה מקדימה)"                             | Button text                               |
| 161  | "Dry run failed. Fix errors above."                               | "ההרצה לדוגמה נכשלה. תקן שגיאות למעלה."                  | Error message                             |
| 168  | "Import"                                                          | "ייבא"                                                   | Button text (use existing t('ui.import')) |
| 172  | "Import failed. Fix errors above."                                | "הייבוא נכשל. תקן שגיאות למעלה."                         | Error message                             |

**New Translation Keys Needed:**

```json
"import": {
  "csvInstructions": "CSV with Hebrew headers; one row per date. Paste content below.",
  "preview": "Preview",
  "assignmentsParsed": "Assignments parsed:",
  "dryRun": "Dry run (preview)",
  "dryRunFailed": "Dry run failed. Fix errors above.",
  "importFailed": "Import failed. Fix errors above."
}
```

---

#### **File:** `app/admin/morning-meetings/page.tsx`

| Line | English Text                                                                          | Proposed Hebrew                                                               | Context                     |
| ---- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | --------------------------- |
| 78   | "Paste CSV content (single month). Columns: date,title,lecturer,organizer,link,notes" | "הדבק תוכן CSV (חודש בודד). עמודות: date,title,lecturer,organizer,link,notes" | Instruction text            |
| 96   | "Import"                                                                              | "ייבא"                                                                        | Button (use t('ui.import')) |
| 100  | "Import failed. Fix errors above."                                                    | "הייבוא נכשל. תקן שגיאות למעלה."                                              | Error message               |

---

#### **File:** `app/admin/reflections/page.tsx`

| Line | English Text                                 | Proposed Hebrew                             | Context                              |
| ---- | -------------------------------------------- | ------------------------------------------- | ------------------------------------ |
| 62   | "Latest"                                     | "אחרון"                                     | Tab label                            |
| 65   | "Edit latest"                                | "ערוך אחרון"                                | Button text                          |
| 68   | "All versions"                               | "כל הגרסאות"                                | Tab label                            |
| 182  | "Editing template v{{version}} ({{status}})" | "עריכת תבנית גרסה {{version}} ({{status}})" | Header                               |
| 192  | "Add prompt"                                 | "הוסף שאלה"                                 | Button                               |
| 230  | "Add section"                                | "הוסף קטע"                                  | Button                               |
| 235  | "Save draft"                                 | "שמור טיוטה"                                | Button                               |
| 238  | "Publish"                                    | "פרסם"                                      | Button                               |
| 251  | "Tutor reflections"                          | "רפלקציות של מדריכים"                       | Tab label                            |
| 252  | "Resident reflections"                       | "רפלקציות של מתמחים"                        | Tab label                            |
| 271  | "Filter by..."                               | "סנן לפי..."                                | Dropdown placeholder                 |
| 304  | "No submissions yet."                        | "אין הגשות עדיין."                          | Empty state                          |
| 307  | "Reflection detail"                          | "פרטי רפלקציה"                              | Section header                       |
| 315  | "Admin comment"                              | "הערת מנהל"                                 | Textarea placeholder                 |
| 319  | "Save"                                       | "שמור"                                      | Button (use t('settings.save'))      |
| 331  | "Reflections"                                | "רפלקציות"                                  | Page title (use t('ui.reflections')) |

**New Translation Keys Needed:**

```json
"reflections": {
  "latest": "Latest",
  "editLatest": "Edit latest",
  "allVersions": "All versions",
  "editingTemplate": "Editing template v{{version}} ({{status}})",
  "addPrompt": "Add prompt",
  "addSection": "Add section",
  "saveDraft": "Save draft",
  "publish": "Publish",
  "tutorReflections": "Tutor reflections",
  "residentReflections": "Resident reflections",
  "filterBy": "Filter by...",
  "noSubmissionsYet": "No submissions yet.",
  "reflectionDetail": "Reflection detail",
  "adminComment": "Admin comment"
}
```

---

### 3. Tutor Pages

#### **File:** `app/tutor/reflections/[taskOccurrenceId]/page.tsx`

| Line | English Text          | Proposed Hebrew    | Context            |
| ---- | --------------------- | ------------------ | ------------------ |
| 40   | "Sign in required"    | "נדרשת התחברות"    | Auth check message |
| 41   | "Loading template…"   | "טוען תבנית..."    | Loading state      |
| 47   | "Tutor reflection"    | "רפלקציה של מדריך" | Page title         |
| 50   | "Resident reflection" | "רפלקציה של מתמחה" | Section header     |
| 76   | "Submitted"           | "הוגש"             | Success message    |

**New Translation Keys Needed:**

```json
"common": {
  "signInRequired": "Sign in required",
  "loadingTemplate": "Loading template…",
  "submitted": "Submitted"
}
```

---

### 4. Resident Pages

#### **File:** `app/resident/page.tsx`

| Line | English Text                                                | Proposed Hebrew                                       | Context        |
| ---- | ----------------------------------------------------------- | ----------------------------------------------------- | -------------- |
| 358  | "My reflections"                                            | "הרפלקציות שלי"                                       | Section header |
| 359  | "Loading…"                                                  | "טוען..."                                             | Loading state  |
| 378  | "No reflections yet. Complete tasks to submit reflections." | "עדיין אין רפלקציות. השלם משימות כדי להגיש רפלקציות." | Empty state    |

**New Translation Keys Needed:**

```json
"resident": {
  "myReflections": "My reflections",
  "loading": "Loading…",
  "noReflectionsYet": "No reflections yet. Complete tasks to submit reflections."
}
```

---

#### **File:** `app/resident/reflections/[taskOccurrenceId]/page.tsx`

| Line | English Text        | Proposed Hebrew | Context         |
| ---- | ------------------- | --------------- | --------------- |
| 20   | "Sign in required"  | "נדרשת התחברות" | Auth check      |
| 21   | "Loading template…" | "טוען תבנית..." | Loading state   |
| 27   | "Write reflection"  | "כתוב רפלקציה"  | Page title      |
| 28   | "Task type:"        | "סוג משימה:"    | Label           |
| 49   | "Submitted"         | "הוגש"          | Success message |

---

#### **File:** `app/resident/reflections/page.tsx`

| Line | English Text                      | Proposed Hebrew            | Context    |
| ---- | --------------------------------- | -------------------------- | ---------- |
| 10   | "My reflections"                  | "הרפלקציות שלי"            | Page title |
| 11   | "Recently submitted reflections." | "רפלקציות שהוגשו לאחרונה." | Subtitle   |

---

### 5. Component Library

#### **File:** `components/resident/Approvals.tsx`

| Line | English Text | Proposed Hebrew | Context                                |
| ---- | ------------ | --------------- | -------------------------------------- |
| 47   | "Rejected"   | "נדחה"          | Dropdown option (use t('ui.rejected')) |

---

#### **File:** `components/resident/Resources.tsx`

| Line | English Text | Proposed Hebrew | Context                                      |
| ---- | ------------ | --------------- | -------------------------------------------- |
| 108  | "Favorites"  | "מועדפים"       | Section label (use t('dashboard.favorites')) |

---

#### **File:** `components/settings/SettingsPanel.tsx`

| Line | English Text | Proposed Hebrew | Context                              |
| ---- | ------------ | --------------- | ------------------------------------ |
| 103  | "English"    | "English"       | Language option (keep as is)         |
| 104  | "עברית"      | "עברית"         | Language option (already Hebrew)     |
| 122  | "Normal"     | "רגיל"          | Density option (use t('ui.normal'))  |
| 123  | "Compact"    | "צפוף"          | Density option (use t('ui.compact')) |

---

#### **File:** `components/admin/rotations/RotationTree.tsx`

| Line | English Text            | Proposed Hebrew   | Context                  |
| ---- | ----------------------- | ----------------- | ------------------------ |
| 67   | "Select a node to edit" | "בחר צומת לעריכה" | Empty state              |
| 236  | "Name"                  | "שם"              | Label (use t('ui.name')) |
| 245  | "Parent"                | "הורה"            | Dropdown label           |
| 282  | "Required Count"        | "כמות נדרשת"      | Input label              |
| 312  | "Links"                 | "קישורים"         | Section header           |
| 313  | "Link"                  | "קישור"           | Default link label       |

**New Translation Keys Needed:**

```json
"rotationTree": {
  "selectNodeToEdit": "Select a node to edit",
  "parent": "Parent",
  "requiredCount": "Required Count",
  "links": "Links",
  "link": "Link"
}
```

---

#### **File:** `components/admin/rotations/RotationsPanel.tsx`

| Line | English Text    | Proposed Hebrew | Context                                  |
| ---- | --------------- | --------------- | ---------------------------------------- |
| 241  | "Manage owners" | "נהל בעלים"     | Dialog header (use t('ui.manageOwners')) |

---

#### **File:** `components/admin/rotations/RotationOwnersEditor.tsx`

| Line | English Text      | Proposed Hebrew | Context                            |
| ---- | ----------------- | --------------- | ---------------------------------- |
| 53   | "Rotation owners" | "בעלי הסבב"     | Section header                     |
| 56   | "Select tutor"    | "בחר מדריך"     | Dropdown placeholder               |
| 82   | "No owners"       | "אין בעלים"     | Empty state (use t('ui.noOwners')) |

**New Translation Keys Needed:**

```json
"rotations": {
  "rotationOwners": "Rotation owners",
  "selectTutor": "Select tutor"
}
```

---

#### **File:** `components/admin/reflections/AdminReflectionsTabs.tsx`

| Line | English Text        | Proposed Hebrew | Context                                  |
| ---- | ------------------- | --------------- | ---------------------------------------- |
| 105  | "Name"              | "שם"            | Table header (use t('ui.name'))          |
| 106  | "Actions"           | "פעולות"        | Table header (use t('overview.actions')) |
| 353  | "Reflection detail" | "פרטי רפלקציה"  | Section header                           |
| 364  | "Save"              | "שמור"          | Button (use t('settings.save'))          |

---

#### **File:** `components/tutor/AssignedResidents.tsx`

| Line | English Text             | Proposed Hebrew           | Context                                           |
| ---- | ------------------------ | ------------------------- | ------------------------------------------------- |
| 42   | "Assigned residents"     | "מתמחים משובצים"          | Section header (use t('tutor.assignedResidents')) |
| 111  | "Assign"                 | "שייך"                    | Dialog header                                     |
| 112  | "Feature not used in v1" | "תכונה לא בשימוש בגרסה 1" | Placeholder text                                  |

**New Translation Keys Needed:**

```json
"tutor": {
  "assign": "Assign",
  "featureNotUsed": "Feature not used in v1"
}
```

---

#### **File:** `components/tutor/tabs/ResidentsTab.tsx`

| Line | English Text           | Proposed Hebrew  | Context                                                    |
| ---- | ---------------------- | ---------------- | ---------------------------------------------------------- |
| 103  | "Has pending petition" | "יש בקשה ממתינה" | Checkbox label (use t('tutor.filters.hasPendingPetition')) |

---

#### **File:** `components/tutor/PendingApprovals.tsx`

| Line | English Text        | Proposed Hebrew   | Context                                          |
| ---- | ------------------- | ----------------- | ------------------------------------------------ |
| 36   | "Pending approvals" | "אישורים ממתינים" | Section header (use t('tutor.pendingApprovals')) |

---

#### **File:** `components/admin/overview/UnassignedQueues.tsx`

| Line | English Text                 | Proposed Hebrew      | Context        |
| ---- | ---------------------------- | -------------------- | -------------- |
| 25   | "Unassigned"                 | "לא משובצים"         | Section header |
| 28   | "All residents are assigned" | "כל המתמחים משובצים" | Empty state    |

**New Translation Keys Needed:**

```json
"overview": {
  "unassigned": "Unassigned",
  "allResidentsAssigned": "All residents are assigned"
}
```

---

#### **File:** `components/admin/overview/ResidentsByRotation.tsx`

| Line | English Text                | Proposed Hebrew   | Context       |
| ---- | --------------------------- | ----------------- | ------------- |
| 140  | "Move resident to rotation" | "העבר מתמחה לסבב" | Dialog header |
| 167  | "Assign tutor"              | "שייך מדריך"      | Dialog header |
| 191  | "Unassign tutor"            | "בטל שיוך מדריך"  | Dialog header |

**New Translation Keys Needed:**

```json
"overview": {
  "moveResidentToRotation": "Move resident to rotation",
  "assignTutor": "Assign tutor",
  "unassignTutor": "Unassign tutor"
}
```

---

#### **File:** `components/admin/overview/TutorLoadTable.tsx`

| Line | English Text | Proposed Hebrew | Context        |
| ---- | ------------ | --------------- | -------------- |
| 26   | "Tutor load" | "עומס מדריכים"  | Section header |
| 31   | "Tutor"      | "מדריך"         | Table header   |
| 32   | "Residents"  | "מתמחים"        | Table header   |

**New Translation Keys Needed:**

```json
"overview": {
  "tutorLoad": "Tutor load",
  "tutor": "Tutor"
}
```

---

### 6. Error & Not Found Pages

#### **File:** `app/not-found.tsx`

| Line | English Text                                 | Proposed Hebrew            | Context       |
| ---- | -------------------------------------------- | -------------------------- | ------------- |
| 5    | "Page not found"                             | "העמוד לא נמצא"            | Error title   |
| 6    | "The page you're looking for doesn't exist." | "העמוד שאתה מחפש לא קיים." | Error message |

**New Translation Keys Needed:**

```json
"errors": {
  "pageNotFound": "Page not found",
  "pageNotFoundMessage": "The page you're looking for doesn't exist."
}
```

---

#### **File:** `app/error.tsx`

| Line | English Text                                      | Proposed Hebrew                        | Context                 |
| ---- | ------------------------------------------------- | -------------------------------------- | ----------------------- |
| 35   | "An unexpected error occurred. Please try again." | "אירעה שגיאה בלתי צפויה. אנא נסה שוב." | Error message (default) |

---

#### **File:** `app/global-error.tsx`

| Line | English Text                                                               | Proposed Hebrew                                           | Context              |
| ---- | -------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------- |
| 35   | "The application encountered an unexpected error. Please reload the page." | "האפליקציה נתקלה בשגיאה בלתי צפויה. אנא טען מחדש את הדף." | Global error message |

**New Translation Keys Needed:**

```json
"errors": {
  "unexpectedError": "An unexpected error occurred. Please try again.",
  "globalError": "The application encountered an unexpected error. Please reload the page."
}
```

---

### 7. Toast Messages & Alerts

#### **File:** `app/admin/page.tsx`

| Line    | English Text                     | Proposed Hebrew                   | Context     |
| ------- | -------------------------------- | --------------------------------- | ----------- |
| 228-229 | "Failed: ..."                    | "נכשל: ..."                       | Error toast |
| 246-247 | "Failed to undo: ..."            | "ביטול נכשל: ..."                 | Error toast |
| 269-270 | "Failed to load more users: ..." | "טעינת משתמשים נוספים נכשלה: ..." | Error toast |
| 290-291 | "Failed to approve tasks: ..."   | "אישור משימות נכשל: ..."          | Error toast |
| 300-301 | "Failed to reject tasks: ..."    | "דחיית משימות נכשלה: ..."         | Error toast |

**New Translation Keys Needed:**

```json
"toasts": {
  "failed": "Failed",
  "failedToUndo": "Failed to undo",
  "failedToLoadMoreUsers": "Failed to load more users",
  "failedToApproveTasks": "Failed to approve tasks",
  "failedToRejectTasks": "Failed to reject tasks"
}
```

---

#### **File:** `app/admin/reflections/page.tsx`

| Line | English Text                  | Proposed Hebrew          | Context |
| ---- | ----------------------------- | ------------------------ | ------- |
| 155  | "Failed to save draft: ..."   | "שמירת טיוטה נכשלה: ..." | Alert   |
| 172  | "Failed to publish: ..."      | "פרסום נכשל: ..."        | Alert   |
| 279  | "Failed to save comment: ..." | "שמירת הערה נכשלה: ..."  | Alert   |

---

## 🟡 MEDIUM PRIORITY - Loading & Empty States

### Loading Messages

Current: Multiple instances of `"Loading…"`, `"Loading template…"`, `"Loading rotations…"`

**Consolidated Translation:**

```json
"common": {
  "loading": "Loading…",
  "loadingTemplate": "Loading template…"
}
```

### Empty States

- "No submissions yet."
- "No reflections yet..."
- "All residents are assigned"
- "No owners"

Already covered in sections above.

---

## 🟢 LOW PRIORITY - Developer/Console Messages

### Console Errors

These appear in console.error() calls and typically aren't shown to end users, but should still be translated for consistency:

- "Failed to check user profile"
- "Failed to approve petition"
- "Failed to assign tutor"
- etc.

**Recommendation:** Keep console messages in English for developer debugging purposes.

---

## 📊 Summary Statistics

- **Total Hardcoded Strings Found:** ~85
- **Already Have Translation Keys:** ~15
- **New Translation Keys Needed:** ~70
- **Files Requiring Updates:** 28

---

## 🎯 Implementation Priority

### Phase 1 (Critical - User-Facing)

1. Navigation & buttons (TopBar, BottomBar)
2. Page titles and section headers
3. Form labels and placeholders
4. Button text

### Phase 2 (Important - Feedback)

1. Toast messages and alerts
2. Error messages
3. Empty states
4. Loading states

### Phase 3 (Polish)

1. Dialog headers
2. Table headers
3. Dropdown placeholders
4. Help text

---

## Next Steps

1. ✅ Review this audit report
2. ⏳ Add new translation keys to `i18n/en.json` and `i18n/he.json`
3. ⏳ Update components to use translation keys instead of hardcoded text
4. ⏳ Test all pages in Hebrew mode
5. ⏳ Verify RTL layout and text rendering
6. ⏳ Check for text overflow issues

---

**Prepared by:** AI Translation Audit System  
**Last Updated:** October 14, 2025
