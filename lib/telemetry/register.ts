/**
 * Telemetry bootstrap invoked from Next.js instrumentation.
 *
 * Initializes shared runtime metadata and annotates Sentry so that
 * downstream logs, traces, and web-vital events can be correlated.
 */

import * as Sentry from '@sentry/nextjs';

declare global {
  var __TRACKER_TELEMETRY__:
    | {
        bootstrappedAt: number;
        runtimes: Set<string>;
      }
    | undefined;
}

const runtime = process.env.NEXT_RUNTIME ?? 'nodejs';

if (!globalThis.__TRACKER_TELEMETRY__) {
  globalThis.__TRACKER_TELEMETRY__ = {
    bootstrappedAt: Date.now(),
    runtimes: new Set<string>(),
  };
}

globalThis.__TRACKER_TELEMETRY__.runtimes.add(runtime);

Sentry.setTag('telemetry.runtime', runtime);
Sentry.setContext('telemetry', {
  bootstrappedAt: globalThis.__TRACKER_TELEMETRY__?.bootstrappedAt,
  runtimes: Array.from(globalThis.__TRACKER_TELEMETRY__?.runtimes ?? []),
});

if (process.env.NODE_ENV !== 'production') {
  console.info(`[tracker][telemetry] Instrumentation register executed on ${runtime}`);
}
