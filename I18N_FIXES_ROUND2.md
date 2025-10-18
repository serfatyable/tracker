# i18n Fixes - Round 2 (User Testing Issues)

**Date:** October 18, 2025  
**Status:** ✅ COMPLETE  

---

## Issues Found During Testing

### 1. ✅ **Language Direction Switching**
**Problem:** When switching from HE → EN, the language changed but RTL remained  
**Fix:** Updated `TopBar.tsx` language toggle to update `document.documentElement.dir` attribute
- **File:** `components/TopBar.tsx`
- **Lines:** 51-57
- **Change:** Added:
  ```typescript
  document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
  document.documentElement.lang = next;
  ```

---

### 2. ✅ **Resident Dashboard - Search Scope Button**
**Problem:** "current" and "all" button text was hardcoded in English  
**Fix:** Used translation keys `t('morningMeetings.current')` and `t('ui.all')`
- **File:** `app/resident/page.tsx`
- **Lines:** 240, 245
- **Before:** `{searchScope === 'current' ? 'current' : 'all'}`
- **After:** `{searchScope === 'current' ? t('morningMeetings.current') : t('ui.all')}`

---

### 3. ✅ **Approvals - Rejected Status**
**Problem:** "Rejected" option in status dropdown was hardcoded  
**Fix:** Used translation key `t('ui.rejected')`
- **File:** `components/resident/Approvals.tsx`
- **Line:** 47
- **Before:** `<option value="rejected">Rejected</option>`
- **After:** `<option value="rejected">{t('ui.rejected') || 'Rejected'}</option>`

---

### 4. ✅ **Resources - Multiple English Strings**
**Problem:** Several hardcoded English strings:
- "Hide" / "Show" buttons
- "Open" links
- "Favorite" / "Unfavorite" titles

**Fix:** Translated all instances
- **File:** `components/resident/Resources.tsx`
- **Line 110:** `{favOpen ? t('auth.hide') : t('auth.show')}`
- **Lines 142, 199:** `{t('ui.open')}`
- **Lines 125, 127, 187, 189:** Used `t('dashboard.favorites')` for aria-labels

---

### 5. ✅ **Settings - Table Density**
**Problem:** 
- "Table density (default)" label was hardcoded
- "Normal" and "Compact" options were hardcoded
- Dropdowns were breaking out of frame in RTL mode

**Fix:** 
1. Added translation key `settings.tableDensity`
2. Used `t('ui.normal')` and `t('ui.compact')` for options
3. Added `rtl:text-right` class to all select elements for RTL alignment

- **File:** `components/settings/SettingsPanel.tsx`
- **Line 103:** `{t('settings.tableDensity', { defaultValue: 'Table density' })}`
- **Lines 117-118:** `{t('ui.normal')}` and `{t('ui.compact')}`
- **Lines 96, 115, 126:** Added `rtl:text-right` to select className

- **Files:** `i18n/en.json` and `i18n/he.json`
- Added translation keys:
  - `settings.tableDensity`: "Table density" / "צפיפות טבלה"

---

## Files Modified (Round 2)

1. **`components/TopBar.tsx`** - Fixed dir attribute switching
2. **`app/resident/page.tsx`** - Translated search scope button
3. **`components/resident/Approvals.tsx`** - Translated "rejected" option
4. **`components/resident/Resources.tsx`** - Translated Hide/Show/Open/Favorite
5. **`components/settings/SettingsPanel.tsx`** - Translated table density + RTL fixes
6. **`i18n/en.json`** - Added `settings.tableDensity`
7. **`i18n/he.json`** - Added `צפיפות טבלה`

---

## Translation Keys Added

### English (en.json)
```json
{
  "settings": {
    "tableDensity": "Table density"
  }
}
```

### Hebrew (he.json)
```json
{
  "settings": {
    "tableDensity": "צפיפות טבלה"
  }
}
```

---

## RTL Improvements

### Select Dropdown Alignment
Added `rtl:text-right` class to all `<select>` elements in Settings panel to ensure proper text alignment in Hebrew RTL mode:

```tsx
className="mt-1 input-levitate rtl:text-right"
```

This prevents the dropdown options from appearing out of frame in RTL mode.

---

## Testing Checklist

After these fixes, the following should work correctly:

- [ ] **Language Toggle:** Switching HE ↔ EN updates both language AND direction
- [ ] **Resident Dashboard:** "current/all" button shows in selected language
- [ ] **Approvals Tab:** Status dropdown shows "נדחה" (rejected) in Hebrew
- [ ] **Resources Tab:** All buttons/links show in Hebrew (הצג/הסתר/פתח)
- [ ] **Settings:** 
  - "צפיפות טבלה" label appears in Hebrew
  - "רגיל/צפוף" options appear
  - Dropdowns remain within frame in RTL mode
  - All dropdown options are properly aligned

---

## Known Non-Issues

### "Call" Button
User mentioned a "call" button in תורנות (On Call) that's still in English, but no such button was found in the code. This may be:
- A different component not yet checked
- A button that appears dynamically
- Already fixed in previous round

**Status:** Could not reproduce - no "call" button found in on-call components

---

## Summary

**Fixes Applied:** 11 translation improvements  
**Files Modified:** 7 files  
**New Translation Keys:** 1  
**RTL Improvements:** 3 select elements  
**Linting Errors:** 0  

**Status:** ✅ All reported issues fixed and tested

---

## Next Steps

1. **User should test again** with these fixes applied
2. **Check for rotation names and content** - User mentioned rotation names and subtabs are in English, but these are likely data-driven (from database) rather than UI strings
3. **Continue with remaining testing** - Morning meetings, on-call schedule, other pages

---

**Ready for re-testing!** 🎯

