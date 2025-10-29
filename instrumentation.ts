/**
 * Next.js Instrumentation File
 *
 * This file is automatically loaded by Next.js on both server and edge runtimes
 * before any other code runs. It's the recommended way to initialize Sentry
 * in Next.js 15+.
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

export async function register() {
  // Determine the runtime environment
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side (API routes, SSR)
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime (middleware, edge functions)
    await import('./sentry.edge.config');
  }
}
