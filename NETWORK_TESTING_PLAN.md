# Network Resilience Testing Plan - Phase 2

**Date:** October 14, 2025  
**Testing Phase:** 2 - Network Degradation & Timeout Handling  
**Previous Phase:** ✅ Critical Stability (6/6 issues fixed)

---

## Overview

This phase tests app behavior under various network conditions including:

- Slow 3G connections (150ms latency, 1.6 Mbps down, 750 kbps up)
- Network timeouts and interruptions
- Offline/Online transitions
- Firebase operation resilience

---

## Test Scenarios

### 1. Slow Network Simulation (3G)

**Browser Settings:**

- Chrome DevTools → Network → Slow 3G
- Latency: 2000ms, Download: 500kb/s, Upload: 500kb/s

**Test Cases:**

- [ ] Initial app load time
- [ ] Authentication (sign in/sign up)
- [ ] Dashboard data loading
- [ ] Navigation between tabs
- [ ] Task logging operations
- [ ] Search functionality
- [ ] Real-time updates

**Success Criteria:**

- Loading states appear within 100ms
- Operations complete or timeout gracefully within 30s
- No infinite loading spinners
- User gets feedback on long operations

---

### 2. Firebase Operation Analysis

**Current Retry Mechanisms Found:**

```typescript
// lib/firebase/db.ts - fetchUserProfile()
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    // operation
  } catch (err) {
    await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
  }
}

// lib/firebase/admin.ts - listUsers()
for (let attempt = 0; attempt < 3; attempt++) {
  try {
    // operation
  } catch (err) {
    await new Promise((r) => setTimeout(r, 150 * Math.pow(2, attempt)));
  }
}
```

**Operations Status:**

- ✅ User profile fetching (has retry - 3x w/ exponential backoff)
- ✅ Task operations (has retry - 3x w/ exponential backoff)
- ✅ Rotation data loading (has retry - 3x w/ exponential backoff)
- ✅ Morning meetings data (IMPROVED - added timeout/retry)
- ✅ On-call data (IMPROVED - added timeout/retry)
- ✅ Rotation nodes loading (IMPROVED - added timeout/retry)
- ✅ Announcements loading (has error handling - Phase 1 fix)
- ✅ Recent logs loading (has error handling - Phase 1 fix)

---

### 3. Timeout Scenarios

**Test Cases:**

- [ ] Firebase query hangs (>30s)
- [ ] Authentication timeout
- [ ] File upload timeout (if any)
- [ ] Real-time listener connection failures

**Expected Behavior:**

- Operations should timeout after reasonable duration
- User should see helpful error messages
- Retry buttons should be available
- App should remain responsive

---

### 4. Network Interruption Tests

**Scenarios:**

- [ ] Go offline during data loading
- [ ] Go offline during form submission
- [ ] Network comes back online
- [ ] Intermittent connectivity (flaky network)

**Success Criteria:**

- App detects offline state
- Pending operations queue properly
- Data syncs when online returns
- No data loss occurs

---

## Test Results

### Slow 3G Performance

| Component          | Load Time | Status | Notes |
| ------------------ | --------- | ------ | ----- |
| Initial Page Load  |           |        |       |
| Authentication     |           |        |       |
| Resident Dashboard |           |        |       |
| Rotations Tab      |           |        |       |
| Task Logging       |           |        |       |
| Search Results     |           |        |       |

### Timeout Handling

| Operation         | Has Timeout | Retry Logic       | User Feedback | Status              |
| ----------------- | ----------- | ----------------- | ------------- | ------------------- |
| User Profile      | ✅ 30s      | ✅ 3x w/ backoff  | ✅            | ✅                  |
| Tasks Loading     | ✅ 30s      | ✅ 3x w/ backoff  | ✅            | ✅                  |
| Rotations Loading | ✅ 30s      | ✅ Fallback query | ✅            | ✅                  |
| Morning Meetings  | ✅ 15s      | ✅ 3x w/ backoff  | ✅            | ✅ IMPROVED         |
| On-call Data      | ✅ 10s      | ✅ 3x w/ backoff  | ✅            | ✅ IMPROVED         |
| Rotation Nodes    | ✅ 20s      | ✅ 3x w/ backoff  | ✅            | ✅ IMPROVED         |
| Announcements     | ❌          | ❌                | ✅            | ⚠️ Non-critical     |
| Recent Logs       | ❌          | ❌                | ✅            | ⚠️ Non-critical     |
| Real-time Updates | ❌          | ❌                | ✅            | ⚠️ Firebase handles |

### Issues Found & Fixed

1. **Issue:** Morning Meetings operations lacked timeout/retry protection
   - **Impact:** Could hang indefinitely on slow networks
   - **Fix Applied:** Added `withTimeoutAndRetry` wrapper (15s timeout, 3 retries)
   - **Priority:** HIGH - ✅ FIXED

2. **Issue:** On-call data loading lacked timeout/retry protection
   - **Impact:** Could hang indefinitely on slow networks
   - **Fix Applied:** Added `withTimeoutAndRetry` wrapper (10s timeout, 3 retries)
   - **Priority:** HIGH - ✅ FIXED

3. **Issue:** Rotation nodes loading lacked timeout/retry protection
   - **Impact:** Could hang indefinitely, blocking critical app functionality
   - **Fix Applied:** Added `withTimeoutAndRetry` wrapper (20s timeout, 3 retries)
   - **Priority:** CRITICAL - ✅ FIXED

4. **Issue:** Generic error messages not user-friendly for network issues
   - **Impact:** Users don't understand connection problems
   - **Fix Applied:** Added `getNetworkErrorMessage` utility for contextual messages
   - **Priority:** MEDIUM - ✅ FIXED

---

## Browser Testing Instructions

### Chrome DevTools Network Throttling

1. Open Chrome DevTools (F12)
2. Go to Network tab
3. Set throttling dropdown to "Slow 3G" or "Fast 3G"
4. Navigate through the app and test all major flows
5. Monitor for:
   - Long loading times without feedback
   - Hanging requests
   - Failed operations
   - Poor user experience

### Custom Network Conditions

For more realistic testing:

```
Slow 3G: 400ms latency, 400kb/s down, 400kb/s up
Fast 3G: 150ms latency, 1.6Mb/s down, 750kb/s up
Regular 4G: 20ms latency, 4Mb/s down, 3Mb/s up
```

---

## Performance Benchmarks

**Target Performance:**

- Initial load: < 5s on Slow 3G
- Navigation: < 2s on Slow 3G
- Data operations: < 10s on Slow 3G
- No operation should hang > 30s

**Current Performance:**

- TBD - will measure during testing

---

## Improvements Needed

Based on testing results, potential improvements:

1. **Timeout Wrappers**
   - Add timeout wrapper for Firebase operations
   - Default 30s timeout for queries
   - 60s timeout for authentication

2. **Progressive Loading**
   - Load critical data first
   - Lazy load secondary content
   - Show partial data while loading

3. **Offline Support**
   - Service worker for offline caching
   - Queue operations when offline
   - Sync when connection restored

4. **Enhanced Error Recovery**
   - Retry buttons in error states
   - "Check connection" prompts
   - Graceful degradation options

---

## Next Steps

After network testing:

1. Implement timeout wrappers where missing
2. Add retry mechanisms for operations without them
3. Enhance loading states for slow connections
4. Create offline fallback strategies
5. Document network best practices
