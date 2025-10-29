/**
 * Sentry Server Configuration
 *
 * This file configures Sentry for the server-side of the application.
 * It initializes error tracking and performance monitoring for API routes and SSR.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from '@sentry/nextjs';

// Only initialize Sentry if DSN is configured
const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (SENTRY_DSN) {
  Sentry.init({
    // Data Source Name - unique identifier for your Sentry project
    dsn: SENTRY_DSN,

    // Environment identification
    environment: process.env.NEXT_PUBLIC_APP_ENV || 'development',

    // Adjust this value in production, or use tracesSampler for greater control
    // Lower sample rate for server to reduce volume
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Filter out errors we don't want to track
    beforeSend(event, hint) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[SENTRY] Would send error:', event);
        return null;
      }

      // Filter out expected errors
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore Firebase Admin SDK initialization warnings (not errors)
        if (error.message.includes('Firebase Admin SDK') && error.message.includes('already')) {
          return null;
        }

        // Ignore expected rate limit errors (they're not bugs)
        if (error.message.includes('RATE_LIMIT_EXCEEDED')) {
          return null;
        }
      }

      return event;
    },

    // Add tags to all events
    initialScope: {
      tags: {
        runtime: 'nodejs',
      },
    },
  });
} else {
  console.warn(
    '[SENTRY] Server-side error tracking is disabled. Set NEXT_PUBLIC_SENTRY_DSN to enable.',
  );
}
