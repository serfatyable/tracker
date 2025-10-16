# Security Fixes Applied

**Date:** October 14, 2025  
**Summary:** Critical security vulnerabilities have been identified and partially fixed.

---

## ✅ What Has Been Fixed

### 1. Secure Authentication Infrastructure Created

**Created Files:**

- ✅ `lib/api/auth.ts` - Server-side authentication utilities
- ✅ `lib/firebase/admin-sdk.ts` - Firebase Admin SDK initialization
- ✅ `lib/api/client.ts` - Client-side authenticated fetch helpers
- ✅ `middleware.ts` - Security headers and CORS middleware
- ✅ `next.config.js` - Updated with security headers
- ✅ `ENV_TEMPLATE.md` - Environment variables documentation

### 2. Example Implementation

**Updated Files:**

- ✅ `app/api/morning-meetings/import/route.ts` - Uses new secure authentication
- ✅ `app/admin/morning-meetings/page.tsx` - Uses authenticated fetch helper

### 3. Documentation Created

- ✅ `SECURITY_AUDIT_REPORT.md` - Comprehensive security audit report
- ✅ `SECURITY_FIXES_APPLIED.md` - This file
- ✅ `ENV_TEMPLATE.md` - Environment setup guide

---

## ⚠️ What Still Needs to Be Done

### CRITICAL - Must Complete Before Production

#### 1. Install Firebase Admin SDK

```bash
pnpm add firebase-admin
```

#### 2. Add Environment Variables

Create `.env.local` (or add to production environment):

```bash
# Server-side (KEEP SECRET!)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

See `ENV_TEMPLATE.md` for detailed instructions.

#### 3. Update Remaining API Routes

The following API routes still use the INSECURE `x-user-uid` header and need to be updated:

**❌ Not Yet Fixed:**

- `app/api/on-call/import/route.ts`
- `app/api/ics/on-call/route.ts`
- `app/api/ics/morning-meetings/route.ts` (no auth at all!)
- `app/api/ics/morning-meetings/[token]/route.ts` (token-based, review needed)

**Pattern to Follow:**

Replace this:

```typescript
const uid = req.headers.get('x-user-uid');
if (!uid) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
```

With this:

```typescript
import { requireAdminAuth, createAuthErrorResponse } from '../../../../lib/api/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdminAuth(req);
    const uid = auth.uid;
    // ... rest of your code
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

#### 4. Update Client-Side API Calls

Find all instances of:

```typescript
'x-user-uid': firebaseUser?.uid || ''
```

And replace with:

```typescript
import { fetchWithAuth } from '../../../lib/api/client';

const res = await fetchWithAuth('/api/your-endpoint', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data),
});
```

**Files to Update:**

- `app/admin/on-call/page.tsx` (2 calls)
- Any other admin pages making API calls

---

## 📋 Complete Checklist

### Immediate (Before Next Deployment)

- [ ] Install firebase-admin: `pnpm add firebase-admin`
- [ ] Add Firebase Admin environment variables (see ENV_TEMPLATE.md)
- [ ] Update `app/api/on-call/import/route.ts` to use secure auth
- [ ] Update `app/api/ics/on-call/route.ts` to use secure auth
- [ ] Update `app/admin/on-call/page.tsx` to use fetchWithAuth
- [ ] Test all API routes with proper authentication
- [ ] Deploy to staging environment first
- [ ] Verify authentication works end-to-end

### High Priority (Within 1 Week)

- [ ] Review and secure `app/api/ics/morning-meetings/route.ts` (currently public!)
- [ ] Add rate limiting to API routes
- [ ] Set up security monitoring/logging
- [ ] Add automated security tests
- [ ] Document security practices for team

### Medium Priority (Within 2 Weeks)

- [ ] Add comprehensive input validation for CSV imports
- [ ] Review and enhance CSP if needed
- [ ] Set up dependency scanning (Dependabot/Renovate)
- [ ] Review Firebase security settings
- [ ] Enable Firebase App Check

---

## 🧪 Testing Guide

### Test Authentication Works

1. **Try without authentication:**

   ```bash
   curl -X POST http://localhost:3000/api/morning-meetings/import \
     -H "Content-Type: text/plain" \
     -d "test"
   ```

   Expected: `401 Unauthorized`

2. **Try with invalid token:**

   ```bash
   curl -X POST http://localhost:3000/api/morning-meetings/import \
     -H "Content-Type: text/plain" \
     -H "Authorization: Bearer invalid-token" \
     -d "test"
   ```

   Expected: `401 Unauthorized`

3. **Try as non-admin user:**
   - Sign in as resident/tutor
   - Try to access admin API
   - Expected: `403 Forbidden`

4. **Try as admin user:**
   - Sign in as admin
   - Import should work successfully

### Test CORS

1. Try calling API from different origin (should be blocked)
2. Verify preflight requests work
3. Check security headers in response

---

## 🔒 Security Best Practices Going Forward

### For Developers

1. **NEVER trust client-provided headers for authentication**
   - Use `requireAdminAuth()` for admin routes
   - Use `requireTutorOrAdminAuth()` for tutor/admin routes
   - Use `verifyAuthToken()` for any authenticated route

2. **Always use `fetchWithAuth()` for API calls from client**
   - Don't manually set Authorization headers
   - The helper handles token refresh automatically

3. **Keep secrets out of code**
   - Use environment variables
   - Never commit `.env.local`
   - Rotate credentials if exposed

4. **Validate all inputs**
   - Check data types and formats
   - Set length limits
   - Sanitize file uploads

### For DevOps/Deployment

1. **Environment Variables**
   - Set in hosting provider (Vercel, etc.)
   - Use separate values for staging/production
   - Rotate Firebase service account keys periodically

2. **Monitoring**
   - Watch for failed auth attempts
   - Monitor unusual API patterns
   - Set up alerts for security events

3. **Regular Updates**
   - Run `pnpm audit` weekly
   - Keep dependencies updated
   - Review security advisories

---

## 📚 Additional Resources

- [Firebase Admin SDK Documentation](https://firebase.google.com/docs/admin/setup)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- Full audit: `SECURITY_AUDIT_REPORT.md`
- Environment setup: `ENV_TEMPLATE.md`

---

## 🆘 Need Help?

### Common Issues

**"Missing Firebase env vars" error:**

- Check you've set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
- Verify private key has proper newlines (`\n`)

**"Authentication failed" in browser:**

- Check user is signed in
- Verify Firebase ID token is being sent
- Check browser console for errors

**CORS errors:**

- Verify middleware.ts is in project root
- Check NEXT_PUBLIC_APP_URL matches your domain
- Clear browser cache

---

**Last Updated:** October 14, 2025  
**Status:** Partial Fix - More Work Required  
**Next Review:** After all API routes are updated
