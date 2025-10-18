# Morning Meetings Excel Import Feature

## Overview
This feature enables administrators to upload Excel files containing morning meetings data. The system validates the data, shows a preview, and imports the meetings into the database.

## What Was Implemented

### 1. Database Schema Update
**File:** `types/morningMeetings.ts`
- Added `dayOfWeek` field: Stores Hebrew day (א, ב, ג, ד, ה, ו)
- Added `moderator` field: Stores the meeting moderator (מנחה)

### 2. Excel Parsing Library
**File:** `lib/morning-meetings/excel.ts`
- Parses Excel files (.xlsx, .xls) using the `xlsx` package
- Supports both Hebrew and English column headers
- **Carry-Forward Logic:** When day/date are empty, inherits from previous row (for multiple sessions per day)
- Required columns:
  - יום (day) - Hebrew day of week (can be empty for 2nd+ session on same day)
  - תאריך (date) - Date in DD/MM/YYYY format (can be empty for 2nd+ session on same day)
  - נושא (title) - Meeting topic
- Optional columns:
  - מציג (lecturer) - Presenter
  - מנחה (moderator) - Moderator
  - רכז (organizer) - Organizer/Coordinator
  - link - URL to meeting resources
  - notes - Additional notes
- Validates:
  - Hebrew day format (א, ב, ג, ד, ה, ו, ש)
  - Date format (automatically converts Excel serial numbers to DD/MM/YYYY)
  - Required fields presence
  - URL format (if provided)
- Handles Excel serial date numbers natively (45949 → 19/10/2025)

### 3. API Route Update
**File:** `app/api/morning-meetings/import/route.ts`
- Updated to handle Excel files instead of CSV
- **NEW:** Supports multi-month imports (can upload multiple months at once)
- Resolves lecturers to user accounts (by email or name)
- Replaces all meetings for all affected months
- Returns detailed validation errors with row numbers

### 4. Import Preview Dialog
**File:** `components/admin/morning-meetings/ImportPreviewDialog.tsx`
- Shows parsed data in a table format
- **NEW:** Color-codes rows by month (blue, green, purple, etc.)
- **NEW:** Shows month badges when multiple months are detected
- **NEW:** Left border stripe on each row indicates the month
- Displays validation errors with specific row numbers
- Shows total row count and error count
- Prevents import if validation errors exist
- Right-to-left layout support for Hebrew text

### 5. Admin Upload Page
**File:** `app/admin/morning-meetings/page.tsx`
- Replaced CSV textarea with Excel file upload
- Drag-and-drop file upload UI
- File type restriction (.xlsx, .xls)
- Automatic preview after file selection
- Shows upload instructions in the UI
- Link to download CSV template (for format reference)

### 6. Display Updates
**File:** `app/morning-meetings/page.tsx`
- Shows Hebrew day of week next to dates
- Displays moderator alongside lecturer
- Calendar view shows day of week with date

### 7. Translations
**Files:** `i18n/en.json`, `i18n/he.json`
- Added complete translations for all new UI elements
- English and Hebrew support
- Keys under `morningMeetings.import.*`

## How to Use

### For Administrators:

**Option 1: From Admin Dashboard**
1. Go to **Admin Dashboard** → **Morning Meetings** tab
2. Click the blue **"Upload Excel Schedule"** button at the top
3. Select or drag-and-drop an Excel file
4. Review the preview and any validation errors
5. If no errors, click **"Confirm Import"**

**Option 2: Direct URL**
1. Navigate to `/admin/morning-meetings`
2. Download the Excel template (recommended) or CSV template for reference
3. Fill in your meeting data following the format
4. Click **"Select Excel File"** or drag-and-drop your filled Excel file
5. The system will parse the file and show a preview
6. Review the data and any validation errors (color-coded by month if multi-month)
7. If no errors, click **"Confirm Import"**
8. All meetings for the affected month(s) will be replaced with the new data

### Excel File Format:

**Download Template:**
- **Excel Template:** `/api/templates/morning-meetings.xlsx`

| יום | תאריך | נושא | מציג | מנחה | רכז | link | notes |
|-----|-------|------|------|------|-----|------|-------|
| א | 19/10/2025 | AW assessment & management | ד״ר דן קוטלר | ד״ר מונה ליכטנשטיין | ד״ר נעימה קציר | https://... | Optional notes |
| | | Advanced Hemodynamic Monitoring | | | ד״ר נעימה קציר | | Second session same day |
| ב | 20/10/2025 | הניחן ריפואי | ד״ר עזרא ארנפלד | ד״ר אלית רחמן | ד״ר גיא פיינברג | | |
| ג | 21/10/2025 | הניחן ריפואי | ד״ר שמעון כהן | ד״ר מוניה לקלמן | ד״ר רון בן טור | | |

**Important Rules:**
- **NEW:** Can upload multiple months in a single file (color-coded preview)
- Date format: DD/MM/YYYY (or Excel serial numbers are auto-converted)
- Hebrew days: א (Sun), ב (Mon), ג (Tue), ד (Wed), ה (Thu), ו (Fri), ש (Sat)
- **Required columns:** יום, תאריך, נושא
- **Optional columns:** מציג, מנחה, רכז, link, notes
- Use Hebrew headers exactly as shown above
- Lecturer, moderator, and organizer can be left empty if not yet assigned
- **Multiple sessions per day:** Leave day/date empty in 2nd+ rows - they'll inherit from the previous row

## Validation

The system validates:
1. ✅ File structure (Excel format)
2. ✅ Required columns present (יום, תאריך, נושא)
3. ✅ Required fields filled (day, date, title)
4. ✅ Hebrew day format (א, ב, ג, etc.)
5. ✅ Date format (DD/MM/YYYY or Excel serial numbers)
6. ✅ URL format (if link provided)
7. ⚠️ **All people fields optional:** Lecturer, moderator, and organizer can be empty
8. 🔄 **Carry-forward:** Empty day/date cells inherit from previous row
9. 🎨 **Multi-month:** Different months shown in different colors in preview

## User Experience Flow

```
1. Upload Excel File
   ↓
2. System Parses File
   ↓
3. Preview Dialog Opens
   ├─ Shows parsed data (color-coded by month)
   ├─ Shows validation errors (if any)
   ├─ Displays row counts
   └─ Shows month badges if multi-month
   ↓
4. User Reviews
   ├─ If errors → Fix Excel and re-upload
   └─ If no errors → Click "Confirm Import"
   ↓
5. Import Executes
   ↓
6. Success Message
```

## Technical Notes

- **Security:** Admin authentication required via Firebase ID token
- **Month Replacement:** Importing replaces ALL meetings for all affected month(s)
- **Multi-Month Support:** Can import multiple months at once; each month is deleted and replaced atomically
- **User Resolution:** System attempts to match lecturer names to user accounts
- **Time Zone:** Meetings are stored at 07:10-07:50 Asia/Jerusalem (04:10-04:50 UTC)
- **Date Key:** Generated as YYYY-MM-DD for efficient querying
- **Color Coding:** Preview uses consistent color hashing to assign each month a unique color

## Files Modified/Created

### Created:
- `lib/morning-meetings/excel.ts`
- `components/admin/morning-meetings/ImportPreviewDialog.tsx`
- `app/api/templates/morning-meetings.xlsx/route.ts` (Excel template download)
- `MORNING_MEETINGS_EXCEL_IMPORT.md` (this file)

### Modified:
- `types/morningMeetings.ts`
- `app/api/morning-meetings/import/route.ts`
- `app/api/templates/morning-meetings.csv/route.ts` (updated CSV template with new columns)
- `app/admin/morning-meetings/page.tsx` (Excel upload UI + template download links)
- `app/admin/page.tsx` (added upload button to dashboard)
- `app/morning-meetings/page.tsx` (display dayOfWeek and moderator)
- `i18n/en.json`
- `i18n/he.json`

## Dependencies

- **xlsx** (v0.18.5) - Already installed, used for Excel parsing

## Future Enhancements

Potential improvements for future versions:
- Support for multi-month imports
- Excel template download (instead of CSV)
- Duplicate detection before import
- Import history/audit log
- Undo last import feature
- Support for updating individual meetings without replacing entire month

