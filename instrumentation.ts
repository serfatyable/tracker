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
  const runtime = process.env.NEXT_RUNTIME;

  if (runtime === 'nodejs') {
    await import('./sentry.server.config');
    await import('./lib/telemetry/register');
    return;
  }

  if (runtime === 'edge') {
    await import('./sentry.edge.config');
    await import('./lib/telemetry/register');
    return;
  }

  await import('./lib/telemetry/register');
}
