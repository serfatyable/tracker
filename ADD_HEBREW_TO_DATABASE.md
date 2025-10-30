# Adding Hebrew Translations to Database Content

**Date:** October 18, 2025  
**Purpose:** Guide to add Hebrew translations for rotation names and content

---

## Overview

Your app now supports bilingual content (English/Hebrew) in the database. The UI code looks for these fields:

- `name_en` - English name
- `name_he` - Hebrew name (if available)
- `name` - Default name (fallback)

When the user selects Hebrew, the app will show `name_he` if it exists, otherwise it falls back to `name_en` or `name`.

---

## What Needs Hebrew Translation

### 1. **Rotations Collection**

Each rotation document in Firestore should have:

```javascript
{
  id: "icu",
  name: "ICU",           // Existing field
  name_en: "ICU",        // NEW: English name
  name_he: "טיפול נמרץ", // NEW: Hebrew name
  // ... other fields
}
```

### 2. **Rotation Nodes (rotationNodes Collection)**

Each rotation node (categories, subcategories, items) should have:

```javascript
{
  id: "node123",
  name: "Airway Management",    // Existing
  name_en: "Airway Management", // NEW: English
  name_he: "ניהול דרכי אוויר",  // NEW: Hebrew
  type: "leaf",
  // ... other fields
}
```

This includes:

- **Categories:** Knowledge, Skills, Guidance → ידע, מיומנויות, הדרכה
- **Subcategories:** All topic names
- **Leaf items:** All individual skills/knowledge items

---

## How to Add Hebrew Translations

### Option 1: Firebase Console (Manual - Small Updates)

1. **Go to Firebase Console** → Firestore Database
2. **Navigate to Collections:**
   - `rotations` collection
   - `rotationNodes` collection
3. **For each document:**
   - Click the document
   - Add new fields:
     - Field: `name_en`, Type: string, Value: (existing English name)
     - Field: `name_he`, Type: string, Value: (Hebrew translation)
4. **Click Update**

**Pros:** Easy for small datasets  
**Cons:** Very tedious for hundreds of items

---

### Option 2: Firestore Admin Script (Recommended - Bulk Update)

I can create a Node.js script that:

1. Reads all existing rotations and nodes
2. Adds `name_en` field (copies from existing `name`)
3. Adds `name_he` field (you provide translations)
4. Updates Firestore in batch

**Steps:**

#### Step 1: Export Current Data

Run this in Firebase Console or create a script:

```javascript
// Get all rotations
const rotationsSnapshot = await firebase.firestore().collection('rotations').get();

rotationsSnapshot.forEach((doc) => {
  console.log({
    id: doc.id,
    name: doc.data().name,
  });
});

// Get all rotation nodes
const nodesSnapshot = await firebase.firestore().collection('rotationNodes').get();

nodesSnapshot.forEach((doc) => {
  console.log({
    id: doc.id,
    name: doc.data().name,
    type: doc.data().type,
  });
});
```

#### Step 2: Create Translation File

Create a JSON file `translations.json`:

```json
{
  "rotations": {
    "icu": {
      "name_en": "ICU",
      "name_he": "טיפול נמרץ"
    },
    "pacu": {
      "name_en": "PACU",
      "name_he": "PACU"
    },
    "or": {
      "name_en": "Operating Room",
      "name_he": "חדר ניתוח"
    }
  },
  "categories": {
    "Knowledge": "ידע",
    "Skills": "מיומנויות",
    "Guidance": "הדרכה"
  },
  "common": {
    "Airway Management": "ניהול דרכי אוויר",
    "Patient Assessment": "הערכת מטופל",
    "Emergency Procedures": "הליכי חירום"
    // ... add more as needed
  }
}
```

#### Step 3: Run Migration Script

Would you like me to create this script for you? It would:

1. Read your existing Firestore data
2. Apply translations from the JSON file
3. Update Firestore with bilingual fields
4. Create a backup before making changes

---

### Option 3: Import Template with Hebrew Names

If you're starting fresh or want to reimport:

1. Export current rotation structure to Excel
2. Add `name_he` column
3. Fill in Hebrew translations
4. Import using the existing import functionality

---

## Quick Translations for Common Terms

Here are some common medical/rotation terms in Hebrew:

### Departments/Locations

| English              | Hebrew              |
| -------------------- | ------------------- |
| ICU                  | טיפול נמרץ          |
| PACU                 | PACU (or: התאוששות) |
| Operating Room       | חדר ניתוח           |
| Labor & Delivery     | חדר לידה            |
| Emergency Department | מיון                |
| Cardiology           | קרדיולוגיה          |
| Anesthesiology       | הרדמה               |

### Categories

| English   | Hebrew    |
| --------- | --------- |
| Knowledge | ידע       |
| Skills    | מיומנויות |
| Guidance  | הדרכה     |

### Common Skills

| English              | Hebrew           |
| -------------------- | ---------------- |
| Airway Management    | ניהול דרכי אוויר |
| Patient Assessment   | הערכת מטופל      |
| Emergency Procedures | הליכי חירום      |
| Monitoring           | ניטור            |
| Documentation        | תיעוד            |
| Communication        | תקשורת           |

---

## What I've Already Fixed in the Code

✅ **UI Components:** All UI text is now translated  
✅ **Rotation Display:** Code now checks for `name_he` when in Hebrew mode  
✅ **Rotation Nodes:** Will display Hebrew names when available  
✅ **Language Initialization:** Fixed to properly load Hebrew on login

---

## What You Need to Do

Choose one approach:

### **Approach A: Let Me Create a Migration Script**

1. **You provide:** A list of your rotation names and key terms
2. **I create:** A script that adds Hebrew fields to your database
3. **You run:** The script (with my guidance)
4. **Time:** 1-2 hours

### **Approach B: Manual Firebase Console Updates**

1. **You do:** Open each rotation/node in Firebase Console
2. **You add:** `name_en` and `name_he` fields manually
3. **Time:** Several hours (depends on data size)

### **Approach C: Excel Import**

1. **You export:** Current rotation structure
2. **You add:** Hebrew column with translations
3. **You import:** Using existing import functionality
4. **Time:** 2-3 hours

---

## Recommendation

**For best results:**

1. **Choose Approach A** (migration script) - fastest and least error-prone
2. **Provide me with:**
   - Screenshot or list of your rotation names
   - Top 20-30 most common terms in your rotations
3. **I'll create:**
   - Translation mapping file
   - Migration script
   - Step-by-step execution guide

---

## Testing After Translation

Once Hebrew content is added:

1. Log in with Hebrew selected
2. Navigate to סבבים (Rotations) tab
3. You should see:
   - Rotation names in Hebrew
   - Category names in Hebrew (ידע, מיומנויות, הדרכה)
   - Item names in Hebrew (if translated)
4. Switch to English - should show English names
5. All UI remains translated properly

---

## Next Steps

**Tell me which approach you prefer:**

1. **Approach A:** "Create the migration script - here are my rotation names: [list]"
2. **Approach B:** "I'll do it manually in Firebase Console"
3. **Approach C:** "I'll use Excel import - can you help me set up the template?"

---

**Ready to add Hebrew content!** 🎯
