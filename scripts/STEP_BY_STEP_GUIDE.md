# Step-by-Step Guide: Adding Hebrew Translations

**📍 You are here:** Ready to add Hebrew to your database

---

## ✅ Step 1: Get Your Current Rotation Names

Run this helper script to see what needs translation:

```bash
# First, install dependencies
cd scripts
npm init -y
npm install firebase-admin

# Then list your rotations
node list-rotations.js --nodes --output my-rotations-template.json
```

**What this does:**
- Lists all your rotations
- Shows which ones are missing Hebrew
- Creates a template file you can fill in

**OR** manually provide your rotation names to me in this format:
```
Rotation ID → Display Name
icu → ICU
pacu → PACU
or → Operating Room
```

---

## ✅ Step 2: Get Firebase Service Account

1. **Go to:** [Firebase Console](https://console.firebase.google.com/)
2. **Select your project**
3. **Click:** ⚙️ Project Settings (gear icon)
4. **Go to:** Service Accounts tab
5. **Click:** "Generate new private key" button
6. **Save as:** `firebase-service-account.json` in your project root folder

**Security Note:** This file is already in .gitignore - never commit it!

---

## ✅ Step 3: Fill in Translations

Edit `scripts/translations.json` with your actual rotation names.

**Current template has examples like:**
```json
{
  "rotations": {
    "icu": {
      "name_en": "ICU",
      "name_he": "טיפול נמרץ"
    }
  }
}
```

**Replace with YOUR rotations:**
1. Copy rotation IDs from Step 1
2. Add English names (name_en)
3. Add Hebrew translations (name_he)

**Need help with Hebrew medical terms?** Let me know and I'll provide translations!

---

## ✅ Step 4: Test Run (Dry Run)

Before making any changes, test what would happen:

```bash
node scripts/add-hebrew-translations.js --dry-run
```

**What to check:**
- ✅ All your rotations are listed
- ✅ Translations look correct
- ✅ No errors appear

**If something looks wrong:** Stop here and ask me for help!

---

## ✅ Step 5: Create Backup

Safety first! Create backup before updating:

```bash
node scripts/add-hebrew-translations.js --backup
```

**This will:**
- Create `backups/` folder
- Save current data as JSON files
- Apply Hebrew translations to Firestore
- Show summary of changes

**Backup location:** `backups/rotations_TIMESTAMP.json`

---

## ✅ Step 6: Test in Your App

1. **Clear browser cache** (Cmd+Shift+R or Ctrl+Shift+F5)
2. **Log out and log back in**
3. **Switch to Hebrew** (HE button in TopBar)
4. **Navigate to Rotations tab**
5. **Check:**
   - ✅ Rotation names in Hebrew?
   - ✅ Categories in Hebrew? (ידע, מיומנויות, הדרכה)
   - ✅ Can switch back to English?

---

## ✅ Step 7: Fix Any Missing Translations

If some items are still in English:

1. **Add them to** `scripts/translations.json`
2. **Re-run:** `node scripts/add-hebrew-translations.js`
3. **Test again**

---

## 🆘 Troubleshooting

### Error: "Cannot find module 'firebase-admin'"
```bash
cd scripts
npm install firebase-admin
```

### Error: "Service account key not found"
Make sure `firebase-service-account.json` is in project root (not in scripts folder)

### Rotations still in English after migration
1. Check browser console for errors
2. Clear browser cache completely
3. Verify Firestore docs have `name_he` field (check Firebase Console)
4. Ensure you're logged in and language is set to Hebrew

### Want to undo changes?
Restore from backup:
```bash
# I can create a restore script if needed
```

---

## 📞 Need Help?

**Where you are now:**
- ✅ Scripts created
- ⏳ Waiting for your rotation names

**Next: Tell me one of these:**

1. **"I ran list-rotations.js and got this output: [paste here]"**
2. **"My rotations are: [list them]"**
3. **"I need help with Step X"**

---

**Let's get those rotation names and translations set up!** 🎯

