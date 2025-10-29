/**
 * Sentry Client Initialization Component
 *
 * This component initializes Sentry on the client side and should be
 * included in the root layout to ensure Sentry is loaded on all pages.
 */

'use client';

import { useEffect } from 'react';

export function SentryInit() {
  useEffect(() => {
    // Import Sentry client configuration
    // This is done in useEffect to ensure it only runs on the client
    import('../../sentry.client.config').catch((err) => {
      console.error('[SENTRY] Failed to initialize client:', err);
    });
  }, []);

  // This component doesn't render anything
  return null;
}
