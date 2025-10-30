# Calendar Subscription Security Guide

## Overview

This application provides secure calendar subscriptions for exams, on-call schedules, and morning meetings. Calendar subscriptions use **token-based authentication** to protect user data while allowing calendar apps (Google Calendar, Apple Calendar, Outlook) to automatically sync events.

**Implementation Date:** 2025-10-29
**Status:** ✅ Implemented and Secure

---

## What is a Calendar Subscription?

A calendar subscription is a URL that calendar applications can use to automatically sync events. Unlike one-time downloads, subscriptions stay up-to-date automatically:

- **One-time download (.ics file):** Download once, never updates
- **Calendar subscription (webcal:// URL):** Automatically checks for updates (daily/weekly)

**Example:**

```
webcal://tracker.app/api/ics/exams/abc123def456...?lang=en
```

Calendar apps periodically fetch this URL to get the latest exam schedule.

---

## Security Model

### Token-Based Authentication

Calendar applications cannot send Authorization headers (like mobile apps do), so we use **secure tokens in the URL** instead.

**How it works:**

1. Each user gets a unique, random 64-character token
2. Token is stored in user's Firestore profile (`settings.icsToken`)
3. Token is included in calendar subscription URLs
4. Server validates token before returning calendar data

**Example URL:**

```
https://tracker.app/api/ics/exams/a1b2c3d4e5f6...64chars...?lang=en
                                   ^^^^^^^^^^^^^^^^^^^^^^^^^
                                   User's unique token
```

### Token Security Properties

| Property          | Details                                                              |
| ----------------- | -------------------------------------------------------------------- |
| **Length**        | 64 characters (256 bits of entropy)                                  |
| **Character Set** | Hexadecimal (0-9, a-f)                                               |
| **Generation**    | `crypto.randomBytes(32)` - OS-level CSPRNG                           |
| **Uniqueness**    | Each user has different token                                        |
| **Randomness**    | 2^256 possible values (impossible to guess)                          |
| **Brute Force**   | At 1 billion attempts/second, would take longer than age of universe |

**Attack Prevention:**

- **Rate Limiting:** 100 requests/hour per IP (prevents enumeration)
- **Generic Errors:** "Unauthorized" (doesn't reveal if token exists)
- **User-Specific:** Token only grants access to that user's data
- **Revocable:** User can regenerate token anytime

---

## Architecture

### Calendar Endpoints

| Endpoint                            | Auth Method                  | Data Returned                         | Use Case                                      |
| ----------------------------------- | ---------------------------- | ------------------------------------- | --------------------------------------------- |
| `/api/ics/exams`                    | Firebase Auth (Bearer token) | All active exams                      | Direct download in app                        |
| `/api/ics/exams/[token]`            | Token-based                  | All active exams                      | Calendar subscription (Google Calendar, etc.) |
| `/api/ics/on-call`                  | Firebase Auth (Bearer token) | User's on-call shifts                 | Direct download in app                        |
| `/api/ics/on-call/[token]`          | Token-based                  | User's on-call shifts                 | Calendar subscription                         |
| `/api/ics/morning-meetings`         | Firebase Auth (Bearer token) | All morning meetings                  | Direct download in app                        |
| `/api/ics/morning-meetings/[token]` | Token-based                  | User's morning meetings (as lecturer) | Calendar subscription                         |

### Rate Limiting

All calendar endpoints are protected by rate limiting (implemented in Task #1):

| Endpoint Type   | Rate Limit                 | Purpose                   |
| --------------- | -------------------------- | ------------------------- |
| **Token-based** | 100 requests/hour per IP   | Prevent token enumeration |
| **Auth-based**  | 100 requests/hour per user | Prevent abuse             |

---

## Token Management

### Generating Tokens

**Server-Side (Firestore Function):**

```typescript
import { generateUserIcsToken } from '@/lib/ics/tokenManagement';

// Generate new token for user
const token = await generateUserIcsToken(userId);

// Token is automatically stored in Firestore: users/{userId}.settings.icsToken
```

**Client-Side (React Component):**

```typescript
import { getUserIcsToken, generateUserIcsToken } from '@/lib/ics/tokenManagement';

function CalendarSettings() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Get existing token or generate new one
    getUserIcsToken(user.uid).then((existingToken) => {
      if (existingToken) {
        setToken(existingToken);
      } else {
        // No token yet, generate one
        generateUserIcsToken(user.uid).then(setToken);
      }
    });
  }, [user.uid]);

  return (
    <div>
      <h2>Calendar Subscriptions</h2>
      <p>Exams: {buildExamsCalendarUrl(token, 'en')}</p>
      <p>On-Call: {buildOnCallCalendarUrl(token, true)}</p>
    </div>
  );
}
```

### Revoking Tokens

**When to revoke:**

- User suspects token was compromised/leaked
- User wants to disable calendar subscriptions
- Security incident requiring all tokens to be rotated

**How to revoke:**

```typescript
import { revokeUserIcsToken, generateUserIcsToken } from '@/lib/ics/tokenManagement';

// Revoke old token
await revokeUserIcsToken(userId);

// Generate new token
const newToken = await generateUserIcsToken(userId);

// Old URLs stop working immediately
// User needs to re-subscribe with new URL
```

### Token Rotation

**Recommended:** Rotate tokens every 90 days for security

```typescript
// Check if token is old
const tokenAge = Date.now() - user.settings.icsTokenGeneratedAt.toMillis();
const NINETY_DAYS = 90 * 24 * 60 * 60 * 1000;

if (tokenAge > NINETY_DAYS) {
  // Token is older than 90 days, rotate it
  await generateUserIcsToken(userId); // Generates new token, overwrites old
}
```

---

## Calendar URL Builders

Helper functions generate correct calendar subscription URLs:

```typescript
import {
  buildExamsCalendarUrl,
  buildOnCallCalendarUrl,
  buildMorningMeetingsCalendarUrl,
} from '@/lib/ics/tokenManagement';

// Exams calendar (English, upcoming only)
const examsUrl = buildExamsCalendarUrl(token, 'en');
// https://tracker.app/api/ics/exams/abc123...?lang=en&upcoming=true

// On-call schedule (personal shifts only)
const onCallUrl = buildOnCallCalendarUrl(token, true);
// https://tracker.app/api/ics/on-call/abc123...?personal=true

// Morning meetings (as lecturer)
const meetingsUrl = buildMorningMeetingsCalendarUrl(token);
// https://tracker.app/api/ics/morning-meetings/abc123...
```

---

## User Instructions

### Adding Calendar Subscription (Google Calendar)

1. Copy your calendar subscription URL from Tracker settings
2. Open Google Calendar
3. Click **+** next to "Other calendars"
4. Select **"From URL"**
5. Paste your calendar URL
6. Click **"Add calendar"**
7. Events will sync automatically

### Adding Calendar Subscription (Apple Calendar)

1. Copy your calendar subscription URL
2. Open Calendar app (macOS or iOS)
3. Go to **File → New Calendar Subscription** (macOS) or **Calendars → Add Subscription** (iOS)
4. Paste your calendar URL
5. Set refresh frequency (recommended: Daily)
6. Click **Subscribe**

### Adding Calendar Subscription (Outlook)

1. Copy your calendar subscription URL
2. Open Outlook
3. Go to **Home → Add Calendar → From Internet**
4. Paste your calendar URL
5. Click **OK**
6. Events will sync automatically

---

## Security Considerations

### What Users Should Know

**✅ SAFE:**

- Sharing calendar URL with calendar apps (Google Calendar, etc.)
- Multiple calendar apps using same URL
- Regenerating token periodically

**❌ UNSAFE:**

- Sharing calendar URL publicly (anyone with URL can see your data)
- Posting calendar URL in public channels (Slack, email, etc.)
- Using same token on shared devices (regenerate token after using shared device)

### Privacy Settings

**Query Parameters:**

- `?personal=true` - Only include your shifts (recommended for on-call)
- `?personal=false` - Include all shifts (admin view)
- `?lang=en` or `?lang=he` - Language preference
- `?upcoming=true` - Only future events (reduces calendar clutter)

**Example (most private):**

```
/api/ics/on-call/your-token?personal=true
```

---

## Troubleshooting

### Calendar not updating

**Symptoms:**

- Calendar shows old data
- New events don't appear

**Solutions:**

1. Check calendar app refresh frequency (should be Daily or Weekly)
2. Manually refresh calendar:
   - Google Calendar: Click refresh button
   - Apple Calendar: Right-click calendar → Refresh
   - Outlook: Click Send/Receive
3. Verify token is still valid (not revoked)
4. Check rate limiting (max 100 requests/hour per IP)

### "Unauthorized" error

**Symptoms:**

- Calendar subscription fails with "Unauthorized"
- URL doesn't work in calendar app

**Solutions:**

1. Verify token is correct (64 characters, no spaces)
2. Check if token was revoked (user may have regenerated)
3. Ensure URL includes token: `/api/ics/exams/[token]`
4. Try regenerating token in Tracker settings

### Token compromised

**Symptoms:**

- Suspicious calendar subscription activity
- Unknown devices accessing calendar

**Solutions:**

1. Revoke current token immediately
2. Generate new token
3. Update calendar subscriptions with new URL
4. Review recent access logs (future enhancement)

---

## Implementation Details

### File Structure

```
lib/ics/
├── tokens.ts              # Token generation and validation
├── tokenManagement.ts     # User token CRUD operations
├── buildOnCallIcs.ts      # ICS builder for on-call
├── buildMorningMeetingsIcs.ts  # ICS builder for meetings
└── (exam builder in utils)

app/api/ics/
├── exams/
│   ├── route.ts           # Auth-based endpoint (direct download)
│   └── [token]/route.ts   # Token-based endpoint (subscription)
├── on-call/
│   ├── route.ts           # Auth-based endpoint
│   └── [token]/route.ts   # Token-based endpoint
└── morning-meetings/
    ├── route.ts           # Auth-based endpoint
    └── [token]/route.ts   # Token-based endpoint (existing)
```

### Firestore Schema

**User Document:**

```typescript
{
  uid: string;
  settings: {
    icsToken: string;           // 64-char hex token
    icsTokenGeneratedAt: Timestamp;  // When token was created
    icsTokenRevokedAt?: Timestamp;   // When token was revoked (if ever)
  };
  // ... other user fields
}
```

### Token Lookup Performance

**Query:**

```typescript
where('settings.icsToken', '==', token);
```

**Performance:**

- Requires Firestore index on `settings.icsToken`
- O(1) lookup time (indexed)
- Returns single user document

**Index Required:**

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [{ "fieldPath": "settings.icsToken", "order": "ASCENDING" }]
}
```

---

## Testing

### Manual Testing

**1. Generate Token:**

```typescript
const token = await generateUserIcsToken('test-user-id');
console.log(token); // Should be 64 hex characters
```

**2. Test Token-Based Endpoint:**

```bash
# Should work
curl https://tracker.app/api/ics/exams/$TOKEN?lang=en

# Should return "Invalid token format"
curl https://tracker.app/api/ics/exams/short-token

# Should return "Unauthorized"
curl https://tracker.app/api/ics/exams/0000000000000000000000000000000000000000000000000000000000000000
```

**3. Test Rate Limiting:**

```bash
# Make 101 requests quickly
for i in {1..101}; do
  curl https://tracker.app/api/ics/exams/$TOKEN
done
# Request 101 should return 429 Too Many Requests
```

**4. Test Calendar Subscription:**

1. Generate token for test user
2. Build calendar URL
3. Add to Google Calendar
4. Verify events appear
5. Add new exam in Tracker
6. Wait for calendar to refresh (or force refresh)
7. Verify new exam appears in calendar

### Automated Testing (Future)

```typescript
describe('ICS Token Security', () => {
  it('should generate unique tokens', () => {
    const token1 = generateCalendarToken();
    const token2 = generateCalendarToken();
    expect(token1).not.toEqual(token2);
  });

  it('should validate token format', () => {
    const validToken = 'a'.repeat(64);
    const invalidToken = 'a'.repeat(63);
    expect(isValidTokenFormat(validToken)).toBe(true);
    expect(isValidTokenFormat(invalidToken)).toBe(false);
  });

  it('should require valid token for calendar endpoint', async () => {
    const response = await fetch('/api/ics/exams/invalid-token');
    expect(response.status).toBe(400);
  });
});
```

---

## Monitoring

### Key Metrics

1. **Token Usage:**
   - Number of active tokens
   - Requests per token per day
   - Tokens older than 90 days

2. **Rate Limiting:**
   - Rate limit hits per day
   - IPs hitting rate limits
   - Suspicious patterns (many IPs with same token)

3. **Errors:**
   - "Unauthorized" error rate (token enumeration attempts?)
   - Token format errors
   - Invalid token attempts

### Alerts

**Recommended alerts:**

1. High rate of "Unauthorized" errors (possible attack)
2. Single token used from >10 different IPs (possible leak)
3. Sudden spike in calendar endpoint requests

---

## Future Enhancements

### Phase 1 (Current)

- ✅ Token-based authentication
- ✅ Rate limiting
- ✅ Token generation/revocation
- ✅ Calendar URL builders

### Phase 2 (Future)

- [ ] Automatic token rotation (90-day expiry)
- [ ] Token usage analytics dashboard
- [ ] Email notifications for suspicious activity
- [ ] Token access logs (which IPs accessed)

### Phase 3 (Future)

- [ ] Multiple tokens per user (different devices)
- [ ] Token scopes (read-only vs read-write)
- [ ] Webhook callbacks for calendar updates
- [ ] Calendar-specific features (colors, categories)

---

## Best Practices

### For Users

1. Keep your calendar URL private (like a password)
2. Regenerate token if you suspect it was leaked
3. Use `?personal=true` for on-call to only see your shifts
4. Check calendar subscriptions periodically (remove unused)

### For Developers

1. Always use generic error messages ("Unauthorized" not "Token not found")
2. Apply rate limiting to all calendar endpoints
3. Log token usage for monitoring
4. Store tokens securely in Firestore (never in client-side code)
5. Test calendar subscriptions with real calendar apps

### For Admins

1. Monitor rate limiting hits
2. Review token usage patterns monthly
3. Implement automatic rotation policy (90 days)
4. Educate users on token security
5. Have incident response plan for token compromise

---

## Related Documentation

- **DEPLOYMENT_TASKS.md:** Task #3 - Secure ICS Endpoints
- **RATE_LIMITING_GUIDE.md:** Rate limiting implementation
- **lib/ics/tokens.ts:** Token generation utilities
- **lib/ics/tokenManagement.ts:** Token CRUD operations

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Implemented By:** Claude Code
**Reviewed By:** Pending
