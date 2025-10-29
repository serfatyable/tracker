/**
 * Sentry Client Configuration
 *
 * This file configures Sentry for the browser/client-side of the application.
 * It initializes error tracking, performance monitoring, and session replay.
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
    // Percentage of transactions to send to Sentry (0.0 to 1.0)
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // Replay sampling rates
    replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
    replaysSessionSampleRate: 0.1, // Capture 10% of all sessions for replay

    // Integration configuration
    integrations: [
      // Captures browser performance metrics
      Sentry.browserTracingIntegration(),

      // Session replay for debugging user sessions
      Sentry.replayIntegration({
        maskAllText: true, // Mask all text for privacy
        blockAllMedia: true, // Block all media (images, videos) for privacy
      }),
    ],

    // Filter out errors we don't want to track
    beforeSend(event, hint) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[SENTRY] Would send error:', event);
        return null;
      }

      // Filter out network errors that are expected
      const error = hint.originalException;
      if (error instanceof Error) {
        // Ignore Firebase network errors (handled by app)
        if (error.message.includes('Firebase') && error.message.includes('network')) {
          return null;
        }

        // Ignore expected auth errors
        if (error.message.includes('auth/user-not-found')) {
          return null;
        }
      }

      return event;
    },

    // Add tags to all events
    initialScope: {
      tags: {
        runtime: 'browser',
      },
    },
  });
} else {
  console.warn(
    '[SENTRY] Client-side error tracking is disabled. Set NEXT_PUBLIC_SENTRY_DSN to enable.',
  );
}
