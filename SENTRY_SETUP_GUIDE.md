# Sentry Error Tracking Setup Guide

## Overview

This application uses **Sentry** for error tracking and performance monitoring in production. Sentry provides real-time error alerts, stack traces, user context, and performance metrics to help quickly identify and fix issues.

**Implementation Date:** 2025-10-29
**Status:** ✅ Implemented and Ready for Production

---

## What is Sentry?

Sentry is an error tracking and performance monitoring platform that helps you:

- **Monitor errors in real-time** - Get instant notifications when errors occur
- **Debug with context** - See full stack traces, user information, and request data
- **Track performance** - Monitor page load times, API response times, and slow database queries
- **Session replay** - Watch recordings of user sessions where errors occurred
- **Release tracking** - Track which deployment introduced a bug

---

## Architecture

### Technology Stack

- **Platform:** Sentry.io
- **SDK:** `@sentry/nextjs` v10.22.0
- **Runtimes:** Client (browser), Server (Node.js), Edge (middleware)

### Integration Points

| Location | Purpose | Status |
|----------|---------|--------|
| `instrumentation.ts` | Auto-initialize Sentry on server/edge | ✅ Configured |
| `sentry.client.config.ts` | Client-side configuration | ✅ Configured |
| `sentry.server.config.ts` | Server-side configuration | ✅ Configured |
| `sentry.edge.config.ts` | Edge runtime configuration | ✅ Configured |
| `lib/utils/logger.ts` | Send logged errors to Sentry | ✅ Integrated |
| `app/error.tsx` | Report React error boundary errors | ✅ Integrated |
| `app/global-error.tsx` | Report critical global errors | ✅ Integrated |
| `lib/sentry/context.ts` | User context and breadcrumbs | ✅ Utility functions |

---

## Setup Instructions

### Step 1: Create Sentry Account (Free Tier)

1. Go to [sentry.io](https://sentry.io)
2. Sign up for free account (5,000 errors/month free)
3. Create a new project:
   - **Platform:** Next.js
   - **Project Name:** `tracker-production`
   - **Alert Frequency:** Real-time or Daily digest

### Step 2: Get DSN (Data Source Name)

After creating the project:

1. Go to **Settings → Projects → tracker-production**
2. Click **Client Keys (DSN)**
3. Copy the **DSN** - it looks like:
   ```
   https://abc123def456@o987654.ingest.sentry.io/1234567
   ```

### Step 3: Configure Environment Variables

**Local Development (`.env.local`):**
```bash
# Sentry DSN (safe to expose, can be public)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/7654321

# App environment (used for filtering in Sentry)
NEXT_PUBLIC_APP_ENV=development
```

**Production (Vercel):**
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add variable:
   - **Key:** `NEXT_PUBLIC_SENTRY_DSN`
   - **Value:** `https://your-key@o123456.ingest.sentry.io/7654321`
   - **Environment:** Production (and optionally Preview)
3. Update `NEXT_PUBLIC_APP_ENV` to `production`

### Step 4: Verify Installation

```bash
# Check dependency is installed
pnpm list @sentry/nextjs

# Should output:
# @sentry/nextjs 10.22.0
```

---

## Configuration Details

### Sampling Rates

To manage volume and costs, we use different sampling rates:

| Environment | Traces (Performance) | Error Replays | Session Replays |
|-------------|----------------------|---------------|-----------------|
| **Development** | 100% (all) | Disabled | Disabled |
| **Production** | 10% (1 in 10) | 100% (all errors) | 10% (1 in 10 sessions) |

**What this means:**
- **Development:** Errors logged to console, not sent to Sentry
- **Production:**
  - All errors are captured
  - 10% of page loads are traced for performance
  - 10% of user sessions are recorded (only if replay enabled)
  - 100% of sessions with errors are recorded

### Filtering Rules

The following errors are **NOT sent to Sentry** (filtered out):

1. **Expected Firebase Network Errors**
   - User offline, temporary network issues
   - These are handled gracefully by the app

2. **Expected Auth Errors**
   - `auth/user-not-found` - User doesn't exist (not a bug)
   - Handled by UI with proper error messages

3. **Rate Limit Errors**
   - `RATE_LIMIT_EXCEEDED` - Working as intended, not a bug

4. **Development Errors**
   - All errors in development are logged to console only
   - Not sent to Sentry to avoid noise

---

## Error Context

Sentry captures rich context with each error:

### Automatic Context

- **User Information:** User ID, email, role, status (when authenticated)
- **Request Data:** URL, HTTP method, headers, query params
- **Device Info:** Browser, OS, device type, screen resolution
- **Environment:** production, staging, or development
- **Release Version:** Git commit hash (if configured)

### Manual Context

You can add custom context using utility functions:

**Setting User Context:**
```typescript
import { setSentryUser, clearSentryUser } from '@/lib/sentry/context';

// After user signs in
setSentryUser({
  id: user.uid,
  email: user.email,
  fullName: user.fullName,
  role: user.role,
  status: user.status
});

// When user signs out
clearSentryUser();
```

**Adding Breadcrumbs:**
```typescript
import { addSentryBreadcrumb } from '@/lib/sentry/context';

// Track user actions leading up to an error
addSentryBreadcrumb(
  'User clicked import button',
  'user-action',
  'info',
  {
    fileName: 'schedule.xlsx',
    fileSize: 1024000
  }
);
```

**Manual Error Capture:**
```typescript
import { captureError } from '@/lib/sentry/context';

try {
  await riskyOperation();
} catch (error) {
  captureError(error as Error, {
    operation: 'data-import',
    recoverable: true
  });
  // Handle error gracefully
}
```

---

## Usage Examples

### Example 1: Track Import Operation

```typescript
import { addSentryBreadcrumb, setSentryContext } from '@/lib/sentry/context';

export async function importMorningMeetings(file: File) {
  // Add breadcrumb
  addSentryBreadcrumb(
    'Starting morning meetings import',
    'import',
    'info',
    { fileSize: file.size }
  );

  // Set custom context
  setSentryContext('import', {
    fileType: file.type,
    fileName: file.name,
    operation: 'morning-meetings'
  });

  try {
    const result = await uploadAndProcess(file);
    return result;
  } catch (error) {
    // Error automatically captured by logger
    logger.error('Import failed', 'MorningMeetings', error);
    throw error;
  }
}
```

### Example 2: API Route Error Tracking

```typescript
export async function POST(req: NextRequest) {
  try {
    const result = await processRequest(req);
    return NextResponse.json(result);
  } catch (error) {
    // Automatically sent to Sentry via logger
    logger.error('API request failed', 'API', error as Error, {
      url: req.url,
      method: req.method
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Example 3: React Component Error

```typescript
function MyComponent() {
  const handleClick = async () => {
    try {
      await dangerousOperation();
    } catch (error) {
      // Caught by error boundary, sent to Sentry
      throw error;
    }
  };

  return <button onClick={handleClick}>Do Something</button>;
}
```

---

## Monitoring & Alerts

### Sentry Dashboard

Access your Sentry dashboard at: https://sentry.io/organizations/your-org/issues/

**Key Sections:**
1. **Issues** - All errors grouped by type
2. **Performance** - Page load times, API latency
3. **Replays** - Video recordings of user sessions
4. **Releases** - Track errors by deployment
5. **Alerts** - Configure notifications

### Setting Up Alerts

1. Go to **Alerts → Create Alert Rule**
2. Configure alert:
   - **Trigger:** When an issue is first seen
   - **Action:** Send notification to Email/Slack
   - **Frequency:** Immediate or daily digest
3. Optional: Set up alerts for:
   - Error rate exceeds threshold (e.g., >10 errors/min)
   - Performance degradation (e.g., p95 > 3s)
   - New error types

### Recommended Alerts

| Alert | Trigger | Notify |
|-------|---------|--------|
| **New Error** | First occurrence | Slack + Email |
| **Error Spike** | >50 errors in 1 hour | Slack (urgent) |
| **Performance** | p95 latency >3s | Email (daily) |
| **High Error Rate** | >10% of requests fail | Slack (urgent) |

---

## Cost Estimation

### Sentry Free Tier

- **Errors:** 5,000 per month
- **Performance:** 10,000 transactions per month
- **Replays:** 50 replay hours per month
- **Retention:** 30 days

**Estimated usage for Tracker (50 active users):**

| Metric | Monthly Volume | Within Free Tier? |
|--------|----------------|-------------------|
| **Errors** | ~500-1,000 | ✅ Yes |
| **Performance traces** | ~5,000 | ✅ Yes |
| **Session replays** | ~20 hours | ✅ Yes |

### Sentry Paid Plans

If exceeding free tier:

- **Team Plan:** $26/month
  - 50,000 errors per month
  - 100,000 performance transactions
  - 500 replay hours
  - 90-day retention

**When to upgrade:**
- More than 50 active users
- Need longer retention (>30 days)
- Want more replays for debugging
- Need advanced features (custom metrics, data scrubbing rules)

---

## Privacy & Security

### Data Scrubbing

Sentry automatically scrubs sensitive data:

- **Passwords** - Removed from all events
- **Credit cards** - Removed from all events
- **Secrets/tokens** - Removed from environment variables

### Session Replay Privacy

Configured with maximum privacy:

```typescript
// In sentry.client.config.ts
Sentry.replayIntegration({
  maskAllText: true,      // Mask all text content
  blockAllMedia: true,    // Block images/videos
})
```

**What this means:**
- All text is replaced with `***`
- Images and videos are blocked
- Only UI structure and interactions are visible
- No sensitive patient data is captured

### Data Retention

- **Free tier:** 30 days
- **Paid plan:** 90 days
- Can be deleted manually anytime

---

## Troubleshooting

### Issue: Errors not appearing in Sentry

**Symptoms:**
- Code throws errors but nothing in Sentry dashboard
- No events in Sentry Issues page

**Solutions:**
1. Check DSN is configured:
   ```bash
   echo $NEXT_PUBLIC_SENTRY_DSN
   ```
2. Check NODE_ENV is `production` (Sentry disabled in development)
3. Check browser console for Sentry errors:
   ```
   [SENTRY] Failed to send: <error>
   ```
4. Verify project is active in Sentry dashboard
5. Check rate limits haven't been exceeded

### Issue: Too many errors in Sentry

**Symptoms:**
- Hundreds of same error
- Hitting rate limits

**Solutions:**
1. Add error to filter list in `sentry.client.config.ts`:
   ```typescript
   beforeSend(event, hint) {
     if (error.message.includes('expected-error')) {
       return null; // Don't send
     }
     return event;
   }
   ```
2. Fix the underlying bug causing the error
3. Increase sampling rate to capture less

### Issue: Can't see stack traces

**Symptoms:**
- Errors show but stack traces are minified
- Can't identify which line caused error

**Solutions:**
1. Upload source maps (optional, requires SENTRY_AUTH_TOKEN)
2. Add Sentry webpack plugin to `next.config.js`
3. For now, use line numbers and file names to debug

---

## Testing Error Tracking

### Manual Test (Development)

```typescript
// Add to any page temporarily
'use client';

import { captureError } from '@/lib/sentry/context';

export default function TestPage() {
  return (
    <button onClick={() => {
      captureError(new Error('Test error from button'), {
        testType: 'manual',
        timestamp: Date.now()
      });
    }}>
      Test Sentry
    </button>
  );
}
```

### Manual Test (Production)

1. Deploy to production with Sentry configured
2. Intentionally trigger an error:
   - Try to import invalid file
   - Navigate to non-existent route
   - Trigger network error
3. Check Sentry dashboard for error within 30 seconds

---

## Advanced Configuration

### Source Maps Upload (Optional)

To see original source code in stack traces:

1. Get auth token from Sentry:
   - Settings → Account → API → Auth Tokens → Create Token
   - Scopes: `project:releases`, `project:write`

2. Add to `.env.local`:
   ```bash
   SENTRY_AUTH_TOKEN=your-token-here
   ```

3. Source maps auto-uploaded on build (future enhancement)

### Custom Integrations

Sentry supports integrations with:
- **Slack** - Real-time error notifications
- **Jira** - Automatically create tickets for errors
- **GitHub** - Link commits to releases
- **PagerDuty** - Alert on-call engineers

---

## Best Practices

### DO ✅

- Set user context after authentication
- Add breadcrumbs for important user actions
- Use `captureError()` for caught exceptions you want to track
- Filter out expected errors (auth failures, network issues)
- Configure alerts for critical errors
- Review errors weekly and prioritize fixes

### DON'T ❌

- Capture every single error (filter noise)
- Send sensitive data (passwords, tokens, PII)
- Ignore errors just because they're in Sentry
- Set sampling rate to 100% in production (too expensive)
- Forget to clear user context on sign-out

---

## Related Documentation

- **Sentry Official Docs:** https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **DEPLOYMENT_TASKS.md:** Task #2 - Error Tracking Implementation
- **lib/sentry/context.ts:** Utility functions for error context
- **lib/utils/logger.ts:** Logger integration with Sentry

---

## Support & Resources

- **Sentry Status:** https://status.sentry.io
- **Community Forum:** https://forum.sentry.io
- **Discord:** https://discord.gg/sentry

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Implemented By:** Claude Code
**Reviewed By:** Pending
