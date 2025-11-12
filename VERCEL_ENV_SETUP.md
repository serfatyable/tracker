# 🚀 Quick Fix: Set Vercel Environment Variables

Your Vercel deployment shows "Firebase is not configured" because environment variables aren't set yet.

## Option 1: Use Vercel Dashboard (Fastest - 5 minutes)

### Steps:

1. **Go to Vercel Dashboard**: https://vercel.com/dashboard
2. **Select project**: `tracker-production`
3. **Go to Settings** → **Environment Variables**
4. **Add each variable below** (click "Add New" for each):

#### Firebase Client Configuration (Public)

```
NEXT_PUBLIC_FIREBASE_API_KEY = AIzaSyCP5PxPWL-R8HlAe_wEgxmj1MLeX8iQTz8
Environment: Production ✅

NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = tracker-prod-286876.firebaseapp.com
Environment: Production ✅

NEXT_PUBLIC_FIREBASE_PROJECT_ID = tracker-prod-286876
Environment: Production ✅

NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = tracker-prod-286876.firebasestorage.app
Environment: Production ✅

NEXT_PUBLIC_FIREBASE_APP_ID = 1:482502738942:web:4a026778f70252eaf0f6af
Environment: Production ✅

NEXT_PUBLIC_APP_URL = https://tracker-production.vercel.app
Environment: Production ✅

NEXT_PUBLIC_APP_ENV = production
Environment: Production ✅
```

#### Firebase Admin Configuration (Secret)

```
FIREBASE_PROJECT_ID = tracker-prod-286876
Environment: Production ✅

FIREBASE_CLIENT_EMAIL = firebase-adminsdk-fbsvc@tracker-prod-286876.iam.gserviceaccount.com
Environment: Production ✅

FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCfiryKMZYP9XZw
ydVitqaMxzLyjsiSUSohFzNAZQLnEwhygEoscUXvr69SlMyEgor4GbG80RWSp2+O
vztfa+WOGhTDl4pktg8kSdX6mLx8x9XfRJYOWBJmKsPCO6cGwFdIaAelYL7LTrLK
n3tbyPsg9eZGlwXrMhlxccP+LgTMFuOjMlqpr7sJTS3HlEUVNSrr42DFMQDlUnp0
SRlkt0ClSOBHqnhfQLiDOQFw4dwn93WAgVIkdtrUBmbAB79zHLPxwNwXqxn+aZcK
Txn/9MKYsiVSHvrkMF6VBV0VyD/h9QIlEJ7CKxR1q8X41aZURyFGeZ6igoymxLLD
ME78rHSjAgMBAAECggEANCmkvlw7D6m2WWcsTPOiHcotZq/3dRtzdlFDEQ1Vtx56
dxFp7wD0GEttO8dp3PNfo4GnIrCL6KC08UumCmtZKS5u1opwFcCOz9MSUrZofjXK
QA8JLtRt45ic258sW6E8iHB2+4PXrdpjy6r8JsTeEudDLJZJOZ5uQjCrn6oFKILZ
EIDkzRAnkMXT+cbOXqEEPw4wpn2cHeZIFdCOf+cBeCsfznOG8Ch1pLSNFjBS2GRk
WGVYFN99ms5IXYGDnKO8hfqI9whGLkzmSLZ8ts3YnrkrOoRn8HyK05pURYwDlkpq
JqiAHm3w5d8zwtKDwpPzUwbUDCWadfKtPpVptxi4eQKBgQDTDtIXpqUZIyTdyx4S
07BjegWWYrULmoByuodX2Thahma6Vaec/3/a7i2eV3l3VmtMiAfHkWbcMROpYcka
0cUxnLmd0dqa4oJH/wlGhuV5IsD2/CJdCyeyThBSDH83b4OpAGEKLhfaLljhGiql
FqjPhMSKNxAcNiKmtI9fs5lGqQKBgQDBg64i6PwuQBqNXS7yckVVqgZ2asvgy++L
y6Vs4ZBQRqYT4tuoxnD7iDLnuRP8ajBau8ZBRPlrq3Al6kq+h7LnWwsE7lb13rDX
FhBZ2iwd2jTBW1BLti2Ob+kacyDvtmqtJk2LNmz+19xQ2tdxE/ModhLIAVwH5RNK
/HqXpWwMawKBgQCwP4giR/9G5po6vQv4HN8HszZHR1Z4wiTRqgKr0bHFpsbShATc
jmBuqsddmx7MEVa5Kj+U4E9NQY5xvD78LoDF1WML79rlzJGPHeLZCn1Gk0cg+ZyY
pmAX/iiS2+zAllcUIkTnA2bXxCxkjj1eb3W5Fd4qraC+blaxb8bq3Ef7QQKBgCNt
Vg3yFWjqN3I14whjvynFrNU1DAoli79OEwTx7pejt3fgilJFsh16e8dMbMpDLoMN
6We9luQNSMTINdLXyPruAgBvGeB9WmamFWw9suHsNshHTVXvDjwLZOOAvEDmZnU4
k+2ukxm8rwrmZZbADj4UD7Ap/406dOO/gToOAM/tAoGAD6de4aii/cxSCqejPxzG
/PzTwSKinhTh286Zj3VPEQRrXJNCTjYMpvlZQrp4Hr7rdmJXm2n50dIH7W6e4c71
aEKpekryKTqHzmZKExieUdW0z94eoeigWMjbvyki02SQeZIsBnT1rovxD18riuZI
2db71YwYRkKk5ifvBA3a8Bw=
-----END PRIVATE KEY-----
Environment: Production ✅
```

**⚠️ Important for FIREBASE_PRIVATE_KEY:**

- Copy the ENTIRE key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- Keep all the newlines (the key spans multiple lines)
- Vercel will handle the formatting automatically

5. **After adding all variables**, go back to **Deployments** tab
6. **Click "Redeploy"** on the latest deployment (or push a new commit to trigger redeploy)

### After Setting Variables:

The deployment should automatically redeploy with the new environment variables. The Firebase error should disappear!

---

## Option 2: Use Vercel CLI (Automated)

If you prefer automation:

```bash
# Install Vercel CLI
npm i -g vercel

# Authenticate
vercel login

# Run setup script
./scripts/setup-production.sh
```

---

## Verify It Worked

After redeploying, check:

1. ✅ Deployment shows "Ready" status
2. ✅ No Firebase error message
3. ✅ App loads correctly at https://tracker-production.vercel.app

---

## Next Steps (After Firebase Works)

1. ✅ Deploy Firestore rules: `firebase use tracker-prod-286876 && firebase deploy --only firestore:rules`
2. ✅ Deploy Firestore indexes: `firebase deploy --only firestore:indexes`
3. ⏭️ Set up Upstash Redis (rate limiting)
4. ⏭️ Set up Sentry (error tracking)

See `DEPLOYMENT_TASKS.md` for complete production checklist.
