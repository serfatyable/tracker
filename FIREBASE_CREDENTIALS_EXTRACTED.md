# 🔐 Firebase Production Credentials - Extracted

## ✅ What You Have (from Service Account JSON)

From your service account JSON file, here are the **Admin SDK** credentials:

```bash
FIREBASE_PROD_ADMIN_PROJECT_ID=tracker-prod-286876
FIREBASE_PROD_ADMIN_CLIENT_EMAIL=firebase-adminsdk-fbsvc@tracker-prod-286876.iam.gserviceaccount.com
FIREBASE_PROD_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfiryKMZYP9XZw\nydVitqaMxzLyjsiSUSohFzNAZQLnEwhygEoscUXvr69SlMyEgor4GbG80RWSp2+O\nvztfa+WOGhTDl4pktg8kSdX6mLx8x9XfRJYOWBJmKsPCO6cGwFdIaAelYL7LTrLK\nn3tbyPsg9eZGlwXrMhlxccP+LgTMFuOjMlqpr7sJTS3HlEUVNSrr42DFMQDlUnp0\nSRlkt0ClSOBHqnhfQLiDOQFw4dwn93WAgVIkdtrUBmbAB79zHLPxwNwXqxn+aZcK\nTxn/9MKYsiVSHvrkMF6VBV0VyD/h9QIlEJ7CKxR1q8X41aZURyFGeZ6igoymxLLD\nME78rHSjAgMBAAECggEANCmkvlw7D6m2WWcsTPOiHcotZq/3dRtzdlFDEQ1Vtx56\ndxFp7wD0GEttO8dp3PNfo4GnIrCL6KC08UumCmtZKS5u1opwFcCOz9MSUrZofjXK\nQA8JLtRt45ic258sW6E8iHB2+4PXrdpjy6r8JsTeEudDLJZJOZ5uQjCrn6oFKILZ\nEIDkzRAnkMXT+cbOXqEEPw4wpn2cHeZIFdCOf+cBeCsfznOG8Ch1pLSNFjBS2GRk\nWGVYFN99ms5IXYGDnKO8hfqI9whGLkzmSLZ8ts3YnrkrOoRn8HyK05pURYwDlkpq\nJqiAHm3w5d8zwtKDwpPzUwbUDCWadfKtPpVptxi4eQKBgQDTDtIXpqUZIyTdyx4S\n07BjegWWYrULmoByuodX2Thahma6Vaec/3/a7i2eV3l3VmtMiAfHkWbcMROpYcka\n0cUxnLmd0dqa4oJH/wlGhuV5IsD2/CJdCyeyThBSDH83b4OpAGEKLhfaLljhGiql\nFqjPhMSKNxAcNiKmtI9fs5lGqQKBgQDBg64i6PwuQBqNXS7yckVVqgZ2asvgy++L\ny6Vs4ZBQRqYT4tuoxnD7iDLnuRP8ajBau8ZBRPlrq3Al6kq+h7LnWwsE7lb13rDX\nFhBZ2iwd2jTBW1BLti2Ob+kacyDvtmqtJk2LNmz+19xQ2tdxE/ModhLIAVwH5RNK\n/HqXpWwMawKBgQCwP4giR/9G5po6vQv4HN8HszZHR1Z4wiTRqgKr0bHFpsbShATc\njmBuqsddmx7MEVa5Kj+U4E9NQY5xvD78LoDF1WML79rlzJGPHeLZCn1Gk0cg+ZyY\npmAX/iiS2+zAllcUIkTnA2bXxCxkjj1eb3W5Fd4qraC+blaxb8bq3Ef7QQKBgCNt\nVg3yFWjqN3I14whjvynFrNU1DAoli79OEwTx7pejt3fgilJFsh16e8dMbMpDLoMN\n6We9luQNSMTINdLXyPruAgBvGeB9WmamFWw9suHsNshHTVXvDjwLZOOAvEDmZnU4\nk+2ukxm8rwrmZZbADj4UD7Ap/406dOO/gToOAM/tAoGAD6de4aii/cxSCqejPxzG\n/PzTwSKinhTh286Zj3VPEQRrXJNCTjYMpvlZQrp4Hr7rdmJXm2n50dIH7W6e4c71\naEKpekryKTqHzmZKExieUdW0z94eoeigWMjbvyki02SQeZIsBnT1rovxD18riuZI\n2db71YwYRkKk5ifvBA3a8Bw=\n-----END PRIVATE KEY-----\n"
```

**⚠️ Important**: The `FIREBASE_PROD_ADMIN_PRIVATE_KEY` value above includes `\n` characters. When you copy it to `.env.production.secure.template`, make sure to keep those `\n` characters exactly as shown (they represent newlines).

---

## ❌ What You Still Need

### 1. Firebase Web App Configuration (Required)

These are **different** from the service account credentials. You need to get them from Firebase Console:

**Steps:**

1. Go to: https://console.firebase.google.com/project/tracker-prod-286876/settings/general
2. Scroll down to **"Your apps"** section
3. If you don't have a web app yet:
   - Click **"Add app"** → Select **Web** (`</>` icon)
   - Register app name: `tracker-prod-web`
   - Click **"Register app"**
4. Copy the Firebase configuration values:
   - `apiKey` → Use for `FIREBASE_PROD_API_KEY`
   - `authDomain` → Use for `FIREBASE_PROD_AUTH_DOMAIN` (should be `tracker-prod-286876.firebaseapp.com`)
   - `storageBucket` → Use for `FIREBASE_PROD_STORAGE_BUCKET` (should be `tracker-prod-286876.appspot.com` or `tracker-prod-286876.firebasestorage.app`)
   - `appId` → Use for `FIREBASE_PROD_APP_ID` (format: `1:123456789:web:abcdef`)

**Example Firebase config object:**

```javascript
const firebaseConfig = {
  apiKey: 'AIzaSy...', // ← FIREBASE_PROD_API_KEY
  authDomain: 'tracker-prod-286876.firebaseapp.com', // ← FIREBASE_PROD_AUTH_DOMAIN
  projectId: 'tracker-prod-286876', // ← Already have this
  storageBucket: 'tracker-prod-286876.appspot.com', // ← FIREBASE_PROD_STORAGE_BUCKET
  messagingSenderId: '123456789', // Optional
  appId: '1:123456789:web:abcdef', // ← FIREBASE_PROD_APP_ID
};
```

### 2. Vercel Production Project Details

You mentioned you have `tracker-production.vercel.app` - confirm:

- **Project name**: `tracker-production` (or whatever you named it)
- **Production URL**: `https://tracker-production.vercel.app`

---

## 📝 Next Steps

1. **Get Firebase Web App Config** (see above)
2. **Update `.env.production.secure.template`** with:
   - ✅ Admin SDK values (already extracted above)
   - ❌ Web app config (get from Firebase Console)
   - ❌ Vercel project details (confirm your project name)
3. **Run setup script**: `./scripts/setup-production.sh`

---

## 🔐 Security Reminder

- ✅ This file is **gitignored** (won't be committed)
- ⚠️ **Never share** the private key publicly
- ⚠️ **Delete** the service account JSON file after extracting values (or keep it very secure)
- ⚠️ The `.env.production.secure.template` file is also gitignored - keep it secure

---

## ✅ Quick Checklist

- [x] Service account JSON downloaded
- [x] Admin SDK credentials extracted
- [ ] Firebase Web App created/configured
- [ ] Web App config values copied
- [ ] `.env.production.secure.template` filled out completely
- [ ] Vercel project name confirmed
- [ ] Ready to run `./scripts/setup-production.sh`
