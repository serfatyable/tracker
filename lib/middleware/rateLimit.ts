/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse by limiting request frequency.
 * Uses Upstash Redis for distributed rate limiting across serverless functions.
 *
 * SECURITY: Prevents DoS attacks, brute force enumeration, and resource exhaustion
 *
 * @see DEPLOYMENT_TASKS.md - Task #1: Rate Limiting Implementation
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextResponse } from 'next/server';

// Environment variable validation
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

/**
 * Check if rate limiting is properly configured
 * In development without Upstash credentials, rate limiting is disabled with warning
 */
function isRateLimitingConfigured(): boolean {
  return Boolean(UPSTASH_REDIS_REST_URL && UPSTASH_REDIS_REST_TOKEN);
}

// Initialize Redis client only if configured
let redis: Redis | null = null;

if (isRateLimitingConfigured()) {
  redis = new Redis({
    url: UPSTASH_REDIS_REST_URL!,
    token: UPSTASH_REDIS_REST_TOKEN!,
  });
} else {
  // Warn in development, but don't block (allows local development without Upstash)
  if (process.env.NODE_ENV !== 'test') {
    console.warn(
      '[RATE LIMIT] Upstash credentials not configured. Rate limiting is DISABLED. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.',
    );
  }
}

/**
 * Rate limiter configurations for different endpoint types
 *
 * Limits are designed to balance security with usability:
 * - Strict limits for security-critical endpoints (token enumeration)
 * - Moderate limits for resource-intensive operations (imports)
 * - Generous limits for common operations (template downloads)
 */
export const rateLimiters = redis
  ? {
      /**
       * Strict limit for token-based authentication endpoints
       * Prevents token enumeration attacks on calendar subscription URLs
       *
       * Limit: 100 requests per hour per IP
       * Use case: /api/ics/morning-meetings/[token]
       */
      tokenAuth: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 h'),
        analytics: true,
        prefix: 'ratelimit:token',
      }),

      /**
       * Moderate limit for admin import operations
       * Prevents resource exhaustion from bulk data imports
       *
       * Limit: 10 imports per hour per admin user
       * Use case: /api/on-call/import, /api/morning-meetings/import, /api/exams/import
       */
      adminImport: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 h'),
        analytics: true,
        prefix: 'ratelimit:import',
      }),

      /**
       * Generous limit for template downloads
       * Prevents bandwidth abuse while allowing normal usage
       *
       * Limit: 60 downloads per hour per IP
       * Use case: /api/templates/*
       */
      templateDownload: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '1 h'),
        analytics: true,
        prefix: 'ratelimit:template',
      }),

      /**
       * Standard limit for general API endpoints
       * Balanced protection for miscellaneous endpoints
       *
       * Limit: 100 requests per hour per IP/user
       * Use case: General API routes
       */
      standard: new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '1 h'),
        analytics: true,
        prefix: 'ratelimit:standard',
      }),
    }
  : null;

/**
 * Apply rate limiting to a request
 *
 * @param identifier - Unique identifier for rate limiting (IP address, user ID, or token)
 * @param limiter - Which rate limiter configuration to use
 * @returns NextResponse with 429 status if rate limited, or null if allowed
 *
 * @example
 * ```typescript
 * const rateLimitResponse = await checkRateLimit(
 *   getClientIdentifier(req, userId),
 *   rateLimiters.adminImport
 * );
 * if (rateLimitResponse) return rateLimitResponse;
 * ```
 */
export async function checkRateLimit(
  identifier: string,
  limiter: Ratelimit | null,
): Promise<NextResponse | null> {
  // Skip rate limiting if not configured (development mode)
  if (!limiter) {
    return null; // Allow request
  }

  try {
    const { success, limit, reset, remaining } = await limiter.limit(identifier);

    if (!success) {
      // Rate limit exceeded - return 429 Too Many Requests
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);

      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          errorCode: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': new Date(reset).toISOString(),
            'Retry-After': retryAfter.toString(),
          },
        },
      );
    }

    // Request allowed - return null (no error)
    // Note: Rate limit headers could be added to successful responses if needed
    return null;
  } catch (error) {
    // If rate limiting fails (e.g., Redis is down), allow the request
    // This prevents rate limiting from becoming a single point of failure
    console.error('[RATE LIMIT] Error checking rate limit:', error);
    return null; // Fail open - allow request
  }
}

/**
 * Extract client identifier from request
 *
 * Priority order:
 * 1. User ID (if authenticated) - most accurate, survives IP changes
 * 2. IP address (from headers) - fallback for unauthenticated requests
 *
 * @param req - The incoming request
 * @param userId - Optional authenticated user ID
 * @returns Identifier string for rate limiting
 *
 * @example
 * ```typescript
 * // For authenticated requests
 * const identifier = getClientIdentifier(req, 'user123');
 * // Returns: "user:user123"
 *
 * // For unauthenticated requests
 * const identifier = getClientIdentifier(req);
 * // Returns: "ip:192.168.1.1"
 * ```
 */
export function getClientIdentifier(req: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Extract IP address from Vercel headers
  // x-forwarded-for contains client IP (may be comma-separated list)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');

  let ip = 'unknown';

  if (forwarded) {
    // Take first IP from comma-separated list (client IP)
    ip = forwarded.split(',')[0]?.trim() || 'unknown';
  } else if (realIp) {
    ip = realIp.trim();
  }

  return `ip:${ip}`;
}

/**
 * Get rate limit status without consuming a token
 * Useful for displaying rate limit info to users
 *
 * @param identifier - Client identifier
 * @param limiter - Rate limiter to check
 * @returns Rate limit status information
 */
export async function getRateLimitStatus(
  identifier: string,
  limiter: Ratelimit | null,
): Promise<{
  remaining: number;
  limit: number;
  reset: Date;
} | null> {
  if (!limiter) return null;

  try {
    // This doesn't consume a token, just checks status
    const { limit, reset, remaining: _remaining } = await limiter.limit(identifier);
    return {
      remaining: _remaining,
      limit,
      reset: new Date(reset),
    };
  } catch (error) {
    console.error('[RATE LIMIT] Error getting rate limit status:', error);
    return null;
  }
}
