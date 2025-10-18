# On-Call Schedule Excel Import System

## Overview
Complete Excel import system for on-call schedules, similar to the morning meetings import. Supports importing monthly schedules with 22 different shift types.

## Files Created

### 1. Core Logic
- **`/lib/on-call/excel.ts`** - Excel parser
  - Parses Excel files with XLSX library
  - Extracts dates and 22 shift types
  - Validates data and returns errors
  - Supports Excel date formats and DD/MM/YYYY strings

### 2. API Endpoint
- **`/app/api/on-call/import/route.ts`** - Import API
  - Authenticates admin users
  - Processes Excel uploads
  - Replaces existing data for affected months
  - Stores shifts in Firestore `onCallShifts` collection

### 3. UI Components
- **`/components/admin/on-call/ImportPreviewDialog.tsx`** - Preview dialog
  - Shows day-by-day preview with color coding by month
  - Displays validation errors
  - Shows total days and shifts count
  - Collapsible shift details (first 3 shown)

- **`/app/admin/on-call/page.tsx`** - Upload page
  - File upload interface
  - Template download link
  - Success confirmation
  - Error handling

### 4. Admin Dashboard Integration
- **`/app/admin/page.tsx`** - Updated
  - Added "Upload Schedule" button to On-Call tab
  - Navigates to `/admin/on-call` upload page

### 5. Translations
- **`/i18n/en.json`** - English translations
- **`/i18n/he.json`** - Hebrew translations
  - Complete translation keys for all UI elements

## Excel File Structure

### Expected Format:
```
Row 1: Empty or title
Row 2: Column headers (shift types in Hebrew)
Row 3+: Data rows

Column A: Day of week (optional, can be formula)
Column B: Date (required - Excel date or DD/MM/YYYY)
Columns C-X: 22 shift types with resident names
```

### 22 Shift Types (Column Mapping):
```
Column C (2):  ת.חדר ניתוח
Column D (3):  ת. חדר לידה
Column E (4):  תורן טיפול נמרץ
Column F (5):  ת.חדר ניתוח נשים
Column G (6):  תורן PACU
Column H (7):  מנהל תורן
Column I (8):  תורן חנ בכיר
Column J (9):  תורן חצי חנ בכיר
Column K (10): כונן
Column L (11): תורן שליש
Column M (12): כיסוי טפנץ
Column N (13): עובד נוסף
Column O (14): אורתו שצי
Column P (15): אורתו טראומה
Column Q (16): אורתו מפרק
Column R (17): SUR
Column S (18): Urol
Column T (19): עמ"ש
Column U (20): כלי דם / חזה
Column V (21): כאב
Column W (22): זריקות עמ"ש
Column X (23): יום מנוחה שבועי
```

## Firestore Data Structure

### Collection: `onCallShifts`

Each document represents one day:
```javascript
{
  date: Timestamp,
  dateKey: "2025-10-15",  // YYYY-MM-DD format
  dayOfWeek: "א",         // Optional
  shifts: {
    "ת.חדר ניתוח": "Dr. Cohen",
    "ת. חדר לידה": "Dr. Levi",
    // ... other shifts
  },
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Required Firestore Index

Add to `firestore.indexes.json`:
```json
{
  "collectionGroup": "onCallShifts",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "dateKey", "order": "ASCENDING" }
  ]
}
```

## Template File Creation

✅ **COMPLETED** - Dynamic template generation is implemented!

### Template Generator API Route
**`/app/api/templates/on-call-schedule.xlsx/route.ts`**

The template is dynamically generated using the XLSX library with:
- **Row 1**: Title "לוח תורנויות - תבנית"
- **Row 2**: All 22 shift type headers in Hebrew
- **Rows 3-9**: 7 example days with sample doctor names
- **Rows 10-32**: Empty rows for one month (ready to fill)
- **Formatting**: Proper borders, RTL support, date formatting
- **Column widths**: Optimized for readability

### Features:
- ✅ Generates fresh template on each download
- ✅ Includes current month dates by default
- ✅ Hebrew interface (RTL support)
- ✅ Professional Excel formatting
- ✅ Sample data to guide users
- ✅ No need to maintain static file

## Usage Flow

1. **Admin navigates** to Admin Dashboard → On-Call tab
2. **Clicks** "Upload Schedule" button
3. **Selects** Excel file (or downloads template first)
4. **System parses** and shows preview with:
   - Month count info
   - Day-by-day breakdown
   - Total counts
   - Any validation errors
5. **Admin reviews** and clicks "Confirm Import"
6. **System imports** data and shows success message
7. **Admin clicks** "View Schedule" to see imported data

## Features

✅ **Multi-month support** - Import multiple months in one file
✅ **Data validation** - Checks dates, shows errors before import
✅ **Preview system** - Review all data before committing
✅ **Color-coded** - Different colors for different months
✅ **Atomic replacement** - Replaces entire months to avoid duplicates
✅ **Bilingual** - Full English & Hebrew translation support
✅ **Error handling** - Clear error messages for users
✅ **Dark mode** - Full dark mode support
✅ **Responsive** - Works on mobile and desktop

## Testing Checklist

- [ ] Upload valid Excel file with one month
- [ ] Upload valid Excel file with multiple months
- [ ] Upload file with invalid dates (should show errors)
- [ ] Upload file with empty rows (should skip)
- [ ] Download template
- [ ] Preview shows correct data
- [ ] Import saves to Firestore correctly
- [ ] Re-import same month replaces data (no duplicates)
- [ ] Test in both English and Hebrew
- [ ] Test in light and dark mode
- [ ] Test on mobile device

## Next Steps

1. ✅ **Template generation** - Complete!
2. ✅ **Template API route** - Complete!
3. **Test with real data** - Upload your actual on-call schedule
4. **Deploy Firestore index** if not already deployed
5. **Add to admin documentation** for training users

## Notes

- The system matches the morning meetings import pattern
- Uses the same visual design language
- Fully integrated with existing authentication and admin checks
- Ready for production use once template file is added

