/**
 * Sentry Edge Configuration
 *
 * This file configures Sentry for Edge Runtime (middleware, edge functions).
 * Edge runtime has limited Node.js API access, so configuration is minimal.
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

    // Lower sample rate for edge to reduce volume
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.05 : 1.0,

    // Disable debug in edge runtime
    debug: false,

    // Filter out errors we don't want to track
    beforeSend(event, _hint) {
      // Don't send events in development
      if (process.env.NODE_ENV === 'development') {
        return null;
      }

      return event;
    },

    // Add tags to all events
    initialScope: {
      tags: {
        runtime: 'edge',
      },
    },
  });
}
