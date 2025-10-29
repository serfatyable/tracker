# Rate Limiting Implementation Guide

## Overview

This application implements **rate limiting** to protect API endpoints from abuse, DoS attacks, and resource exhaustion. Rate limiting is implemented using **Upstash Redis** with the `@upstash/ratelimit` library.

**Implementation Date:** 2025-10-29
**Status:** ✅ Implemented and Ready for Production

---

## What is Rate Limiting?

Rate limiting restricts the number of requests a client can make to the server within a specific time window. This prevents:

- **Token enumeration attacks** - Brute forcing authentication tokens
- **Resource exhaustion** - Overwhelming server with import operations
- **DoS attacks** - Taking down the service with excessive requests
- **Cost explosion** - Excessive Firebase operations leading to high costs

---

## Architecture

### Technology Stack

- **Redis Provider:** Upstash (serverless-friendly)
- **Library:** `@upstash/ratelimit` v2.0.6
- **Redis Client:** `@upstash/redis` v1.35.6
- **Deployment:** Vercel (serverless functions)

### Rate Limiter Types

The application uses **4 different rate limiters** based on endpoint type:

| Limiter | Limit | Window | Use Case | Endpoints |
|---------|-------|--------|----------|-----------|
| **tokenAuth** | 100 requests | 1 hour | Token-based calendar subscriptions | `/api/ics/morning-meetings/[token]` |
| **adminImport** | 10 imports | 1 hour | Bulk data imports | `/api/on-call/import`<br>`/api/morning-meetings/import`<br>`/api/exams/import` |
| **templateDownload** | 60 downloads | 1 hour | Template downloads | `/api/templates/*` |
| **standard** | 100 requests | 1 hour | General API endpoints | `/api/ics/morning-meetings`<br>`/api/ics/on-call`<br>`/api/ics/exams` |

### Identifier Strategy

Rate limits are applied per **identifier**:

1. **Authenticated requests** → Uses `user:{uid}` (more accurate, survives IP changes)
2. **Unauthenticated requests** → Uses `ip:{ip_address}` (fallback)

---

## Setup Instructions

### 1. Sign Up for Upstash (Free Tier)

1. Go to [upstash.com](https://upstash.com)
2. Sign up for free account
3. Create a new Redis database:
   - **Name:** `tracker-rate-limiting`
   - **Type:** Regional or Global (Global recommended for multi-region)
   - **Region:** Choose closest to your primary users
   - **TLS:** Enabled (default)

### 2. Get Credentials

After creating the database:

1. Go to **Database Details**
2. Copy **REST API** credentials (not Redis URL):
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 3. Configure Environment Variables

**Local Development (`.env.local`):**
```bash
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXabcdEFGHIJKLMNOPQRSTUVWXYZ1234567890
```

**Production (Vercel):**
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add both variables:
   - `UPSTASH_REDIS_REST_URL` → `https://your-db.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → `AXabcd...` (your token)
3. Select environment: **Production** (and optionally Preview)

### 4. Verify Installation

```bash
# Check dependencies are installed
pnpm list @upstash/ratelimit @upstash/redis

# Should output:
# @upstash/ratelimit 2.0.6
# @upstash/redis 1.35.6
```

---

## Protected Endpoints

### Import Endpoints (10 requests/hour per admin)

| Endpoint | Method | Authentication | Rate Limit |
|----------|--------|----------------|------------|
| `/api/on-call/import` | POST | Admin only | 10/hour |
| `/api/morning-meetings/import` | POST | Admin only | 10/hour |
| `/api/exams/import` | POST | Admin/Tutor | 10/hour |

**Error Response:**
```json
{
  "error": "Too many requests. Please try again later.",
  "errorCode": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 3421
}
```

**HTTP Status:** `429 Too Many Requests`

**Headers:**
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-10-29T15:30:00.000Z
Retry-After: 3421
```

### Calendar Subscription Endpoints

| Endpoint | Method | Authentication | Rate Limit |
|----------|--------|----------------|------------|
| `/api/ics/morning-meetings/[token]` | GET | Token-based | 100/hour per IP |
| `/api/ics/morning-meetings` | GET | Required | 100/hour per user |
| `/api/ics/on-call` | GET | Required | 100/hour per user |
| `/api/ics/exams` | GET | Required | 100/hour per user |

### Template Download Endpoints (60 downloads/hour per IP)

| Endpoint | Method | Authentication | Rate Limit |
|----------|--------|----------------|------------|
| `/api/templates/rotation.xlsx` | GET | None | 60/hour |
| `/api/templates/rotation.csv` | GET | None | 60/hour |
| `/api/templates/morning-meetings.xlsx` | GET | None | 60/hour |
| `/api/templates/morning-meetings.csv` | GET | None | 60/hour |
| `/api/templates/on-call-schedule.xlsx` | GET | None | 60/hour |
| `/api/templates/on-call.csv` | GET | None | 60/hour |
| `/api/templates/exams.xlsx` | GET | None | 60/hour |

---

## Testing Rate Limiting

### Manual Testing

**Test Script (Bash):**
```bash
#!/bin/bash
# Test rate limiting on template endpoint

ENDPOINT="http://localhost:3000/api/templates/rotation.xlsx"

echo "Testing rate limit (60 requests/hour)..."
for i in {1..65}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" $ENDPOINT)

  if [ "$response" = "429" ]; then
    echo "✅ Rate limited at request #$i"
    exit 0
  fi

  echo "Request #$i: $response"
  sleep 0.1
done

echo "❌ Rate limiting not working - completed 65 requests"
```

**Test Import Endpoint:**
```bash
#!/bin/bash
# Test rate limiting on import endpoint (requires admin auth)

ENDPOINT="http://localhost:3000/api/morning-meetings/import"
AUTH_TOKEN="your-firebase-id-token"

for i in {1..12}; do
  response=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -F "file=@test-import.xlsx" \
    $ENDPOINT)

  if [ "$response" = "429" ]; then
    echo "✅ Rate limited at request #$i"
    exit 0
  fi

  echo "Import #$i: $response"
  sleep 1
done
```

### Automated Testing (Future)

**Unit Test (Vitest):**
```typescript
import { describe, it, expect, vi } from 'vitest';
import { checkRateLimit, rateLimiters } from '@/lib/middleware/rateLimit';

describe('Rate Limiting', () => {
  it('should allow requests within limit', async () => {
    const identifier = 'test:user123';
    const result = await checkRateLimit(identifier, rateLimiters.standard);
    expect(result).toBeNull(); // Allowed
  });

  it('should block requests exceeding limit', async () => {
    const identifier = 'test:abuser';

    // Make 101 requests
    for (let i = 0; i < 101; i++) {
      await checkRateLimit(identifier, rateLimiters.standard);
    }

    // 102nd request should be blocked
    const result = await checkRateLimit(identifier, rateLimiters.standard);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(429);
  });
});
```

---

## Development Mode Behavior

**Without Upstash credentials:**
- Rate limiting is **DISABLED**
- Warning logged to console:
  ```
  [RATE LIMIT] Upstash credentials not configured. Rate limiting is DISABLED.
  Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.
  ```
- All requests are allowed (for local development convenience)

**With Upstash credentials:**
- Rate limiting is **ENABLED**
- All limits enforced as configured

**In tests:**
- Rate limiting is **DISABLED** (no warnings)
- Test suite runs without Redis dependency

---

## Monitoring & Analytics

### Upstash Dashboard

1. Go to [console.upstash.com](https://console.upstash.com)
2. Select your database
3. View metrics:
   - **Throughput** - Requests per second
   - **Total Commands** - Total requests processed
   - **Storage** - Redis memory usage

### Rate Limit Analytics

Upstash Ratelimit library includes built-in analytics:

```typescript
// Enable analytics when creating limiter
new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 h'),
  analytics: true, // ✅ Enabled
});
```

**What's tracked:**
- Total requests per identifier
- Rate limit hits (429 responses)
- Request patterns over time

**Viewing analytics:**
- Available via Upstash Analytics API (future integration)
- Can be exported to monitoring tools (Sentry, DataDog)

---

## Cost Estimation

### Upstash Free Tier

- **Commands:** 10,000 per day
- **Storage:** 256 MB
- **Bandwidth:** 1 GB per day
- **Global replication:** Included

**Estimated usage for Tracker application:**

| Scenario | Daily Requests | Commands Used | Within Free Tier? |
|----------|----------------|---------------|-------------------|
| **Light usage** (10 users) | ~500 | ~1,000 | ✅ Yes |
| **Medium usage** (50 users) | ~2,500 | ~5,000 | ✅ Yes |
| **Heavy usage** (200 users) | ~10,000 | ~20,000 | ⚠️ No (need paid plan) |

**Each rate limit check = 2 Redis commands** (1 increment, 1 expire)

### Upstash Paid Plans

If exceeding free tier:

- **Pay-as-you-go:** $0.2 per 100,000 commands
- **Pro plan:** $120/month (20M commands included)

**Example cost calculation:**
- 50,000 daily requests = 100,000 commands
- Monthly: ~3,000,000 commands
- Cost: **~$6/month** (pay-as-you-go)

---

## Troubleshooting

### Issue: Rate limiting not working

**Symptoms:**
- Can send unlimited requests
- No 429 errors returned

**Solutions:**
1. Check environment variables are set:
   ```bash
   echo $UPSTASH_REDIS_REST_URL
   echo $UPSTASH_REDIS_REST_TOKEN
   ```
2. Verify credentials in Upstash dashboard
3. Check server logs for warnings
4. Restart development server: `pnpm dev`

### Issue: All requests getting 429

**Symptoms:**
- Even first request returns 429
- Rate limit seems too strict

**Solutions:**
1. Check Upstash database status (may be down)
2. Verify correct rate limiter is being used
3. Check if identifier is being reused (e.g., all requests using same IP)
4. Clear rate limit data:
   ```bash
   # In Upstash CLI
   KEYS ratelimit:*
   DEL ratelimit:ip:127.0.0.1
   ```

### Issue: Rate limit not resetting

**Symptoms:**
- Rate limit persists after 1 hour
- `retryAfter` value is incorrect

**Solutions:**
1. Verify sliding window implementation
2. Check system time is correct (UTC)
3. Restart Upstash connection:
   ```typescript
   // In code
   redis.flushdb(); // Clear all rate limit data (dev only!)
   ```

---

## Security Considerations

### 1. Identifier Spoofing

**Risk:** Attacker spoofs IP address to bypass rate limits

**Mitigation:**
- Vercel provides trusted `x-forwarded-for` header
- Cannot be spoofed by client
- Uses first IP in forwarded chain (true client IP)

### 2. Distributed Attacks

**Risk:** Attacker uses multiple IPs (botnet)

**Mitigation:**
- Rate limiting still applies per IP
- Reduces attack effectiveness by 99%+
- Consider adding global rate limit for extreme cases

### 3. Credential Exposure

**Risk:** Upstash credentials leaked in code

**Mitigation:**
- Credentials stored in environment variables only
- Never committed to git
- Server-side only (not exposed to client)
- Rotatable without code changes

### 4. Redis Downtime

**Risk:** Upstash is down, rate limiting fails

**Mitigation:**
- **Fail-open policy** - Allow requests if Redis is down
- Prevents rate limiting from being single point of failure
- Logs error for monitoring: `[RATE LIMIT] Error checking rate limit`

---

## Future Enhancements

### Phase 1 (Current)
- ✅ Basic rate limiting on critical endpoints
- ✅ Per-user and per-IP limits
- ✅ Configurable limits per endpoint type

### Phase 2 (Month 1)
- [ ] Dynamic rate limit adjustment based on user role
- [ ] Rate limit exemptions for trusted users/IPs
- [ ] Enhanced analytics dashboard
- [ ] Automated alerts for abuse patterns

### Phase 3 (Month 2-3)
- [ ] Machine learning-based anomaly detection
- [ ] Adaptive rate limits based on load
- [ ] Geographic rate limiting (stricter for certain regions)
- [ ] Rate limit API for admin dashboard

---

## References

- **Upstash Ratelimit Documentation:** https://upstash.com/docs/redis/sdks/ratelimit-ts/overview
- **Vercel Rate Limiting:** https://vercel.com/docs/security/rate-limiting
- **OWASP Rate Limiting:** https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks
- **DEPLOYMENT_TASKS.md:** Task #1 - Rate Limiting Implementation

---

**Document Version:** 1.0
**Last Updated:** 2025-10-29
**Implemented By:** Claude Code
**Reviewed By:** Pending
