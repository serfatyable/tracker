# 🔒 Quick Start: Securing Your Tracker App

**⚠️ CRITICAL:** Authentication bypass vulnerability found. Follow this guide to fix.

---

## 🚨 Current Status

**Your API routes can be bypassed by anyone.** This guide fixes it in ~90 minutes.

---

## 📋 Quick Checklist (Copy & Paste)

```
Installation (5 min):
☐ pnpm add firebase-admin

Environment Setup (10 min):
☐ Go to Firebase Console
☐ Download service account key
☐ Add to .env.local (see ENV_TEMPLATE.md)

Code Updates (45 min):
☐ Update app/api/on-call/import/route.ts
☐ Update app/api/ics/on-call/route.ts
☐ Update app/api/ics/morning-meetings/route.ts
☐ Update app/admin/on-call/page.tsx

Testing (15 min):
☐ Test without auth (should fail)
☐ Test as non-admin (should fail)
☐ Test as admin (should work)

Deployment (15 min):
☐ Add env vars to hosting provider
☐ Deploy to staging
☐ Test staging
☐ Deploy to production
```

---

## 🎯 Two-File Quick Reference

### Fix an API Route:

**File:** Any `app/api/*/route.ts`

**Find this:**

```typescript
const uid = req.headers.get('x-user-uid');
if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
```

**Replace with:**

```typescript
import { requireAdminAuth, createAuthErrorResponse } from '../../../../lib/api/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminAuth(req);
    const uid = auth.uid;

    // Your existing code here
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('Missing') ||
        error.message.includes('Invalid') ||
        error.message.includes('Forbidden'))
    ) {
      return createAuthErrorResponse(error);
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Fix a Client Call:

**File:** Any `app/*/page.tsx`

**Find this:**

```typescript
const res = await fetch('/api/something', {
  headers: { 'x-user-uid': firebaseUser?.uid || '' },
  // ...
});
```

**Replace with:**

```typescript
import { fetchWithAuth } from '../../../lib/api/client';

const res = await fetchWithAuth('/api/something', {
  // Remove x-user-uid header
  // ...
});
```

---

## 🔑 Environment Variables (Copy to .env.local)

```bash
# Get from Firebase Console → Project Settings → Service Accounts
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Key-Here\n-----END PRIVATE KEY-----\n"
```

**How to get these:**

1. [Firebase Console](https://console.firebase.google.com) → Your Project
2. ⚙️ Project Settings → Service Accounts
3. "Generate New Private Key" button
4. Download JSON, extract values above

---

## 🧪 Test Your Fixes

```bash
# Should fail with 401
curl -X POST http://localhost:3000/api/morning-meetings/import \
  -d "test data"

# Should fail with 401
curl -X POST http://localhost:3000/api/morning-meetings/import \
  -H "Authorization: Bearer fake-token" \
  -d "test data"

# Should work (after signing in as admin in browser)
# Use browser dev tools network tab to see actual token
```

---

## 📚 Full Documentation

- **Start:** `SECURITY_SUMMARY.md` - Overview & quick guide
- **Detailed:** `SECURITY_FIXES_APPLIED.md` - Step-by-step instructions
- **Complete:** `SECURITY_AUDIT_REPORT.md` - Full audit details
- **Setup:** `ENV_TEMPLATE.md` - Environment variables explained

---

## ⏱️ Time Breakdown

- Install dependencies: 5 min
- Get credentials: 10 min
- Update 3 API routes: 30 min
- Update 1-2 client pages: 15 min
- Testing: 15 min
- Deployment: 15 min

**Total: ~90 minutes**

---

## 🆘 Problems?

### "Cannot find module 'firebase-admin'"

→ Run: `pnpm add firebase-admin`

### "Missing Firebase env vars"

→ Check `.env.local` exists and has all three variables

### "Invalid token" errors

→ Check Firebase service account credentials are correct

### "CORS errors"

→ Clear browser cache, check `middleware.ts` exists

---

## ✅ When You're Done

You'll have:

- ✅ Proper cryptographic authentication
- ✅ Role-based access control
- ✅ Security headers on all routes
- ✅ CORS properly configured
- ✅ Production-ready security

---

**Need more detail?** See `SECURITY_FIXES_APPLIED.md`

**Questions about findings?** See `SECURITY_AUDIT_REPORT.md`

**Ready to start?** Install firebase-admin and see `ENV_TEMPLATE.md`! 🚀
