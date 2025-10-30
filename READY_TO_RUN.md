# ✅ Ready to Run Migration!

Your translations file is complete and ready to use.

---

## 🎯 Your Rotations (Translated)

| English         | Hebrew         |
| --------------- | -------------- |
| ICU             | טיפול נמרץ     |
| PACU            | PACU           |
| Block Room      | חדר בלוקים     |
| Pain            | טיפול בכאב     |
| Pediatrics      | ילדים          |
| Obstetrics      | מיילדות        |
| Neurosurgery    | נוירוכירורגיה  |
| Cardiac Surgery | כירורגיה לבבית |
| Operating Room  | חדר ניתוח      |

**Plus 45+ common anesthesia terms!**

---

## 🚀 Next Steps (Choose One)

### **Option A: Quick Test First (Recommended)**

1. **Get Firebase Service Account:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Project Settings → Service Accounts
   - "Generate new private key"
   - Save as `firebase-service-account.json` in project root

2. **Install Dependencies:**

   ```bash
   cd scripts
   npm install firebase-admin
   cd ..
   ```

3. **Dry Run (See What Would Change):**

   ```bash
   node scripts/add-hebrew-translations.js --dry-run
   ```

   This will show you:
   - ✅ What rotations will be updated
   - ✅ What Hebrew names will be added
   - ✅ No actual changes yet!

4. **If Looks Good, Run For Real:**

   ```bash
   node scripts/add-hebrew-translations.js --backup
   ```

   This will:
   - 📦 Create backup files first
   - ✏️ Add Hebrew fields to Firestore
   - ✅ Show summary of changes

5. **Test Your App:**
   - Clear browser cache
   - Log out and log in
   - Switch to Hebrew (HE button)
   - Go to Rotations tab
   - **You should see Hebrew names!** 🎉

---

### **Option B: Let Me Walk You Through It**

If you want step-by-step guidance:

1. **Tell me:** "I'm ready to start"
2. **I'll guide you** through each command
3. **We'll verify** together at each step
4. **Safe and supervised!**

---

## 📝 What the Script Does

The migration script will:

1. ✅ Read your current Firestore data
2. ✅ Find rotations without Hebrew names
3. ✅ Add `name_en` field (English name)
4. ✅ Add `name_he` field (Hebrew name)
5. ✅ Also update rotation nodes (categories, items)
6. ✅ Keep your existing data intact

**Safe:** Original `name` field is never deleted!

---

## ⚠️ Important Notes

### **Database IDs**

The script uses your Firebase rotation IDs. Common variations are covered:

- `icu` or `ICU`
- `pacu` or `PACU`
- `block_room` or `blockroom`
- `pediatrics` or `peds`
- `obstetrics` or `obs` or `ob`
- `neurosurgery` or `neuro`
- `cardiac_surgery` or `cardiac`
- `operating_room` or `or`

If your Firebase IDs are different, we can adjust!

### **Testing is Safe**

- Dry run shows changes WITHOUT applying them
- Backup flag creates JSON copies before updating
- You can always restore from backup if needed

---

## 🆘 Troubleshooting

### "Cannot find module 'firebase-admin'"

```bash
cd scripts
npm install firebase-admin
```

### "Service account key not found"

Make sure `firebase-service-account.json` is in:

```
tracker/
├── firebase-service-account.json  ← HERE
├── scripts/
│   └── add-hebrew-translations.js
└── ...
```

### Rotations Still in English

1. Check Firebase Console to verify `name_he` field exists
2. Clear browser cache (Cmd+Shift+R)
3. Log out and log back in
4. Make sure language is set to Hebrew

---

## 📞 Ready?

**Tell me:**

1. **"I'm ready to run the dry-run"** - I'll guide you step by step
2. **"I need help getting the service account"** - I'll walk you through it
3. **"I ran it and got [result]"** - I'll help interpret the output
4. **"Something went wrong: [error]"** - I'll help fix it

---

**Your translations are ready! Let's make your app bilingual! 🎯**
