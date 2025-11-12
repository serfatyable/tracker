'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  const [eventId, setEventId] = useState<string | null>(null);
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@tracker.app';

  useEffect(() => {
    // Log the error to console for development
    console.error('Global error caught by error boundary:', error);

    // Send error to Sentry in production (dynamic import to avoid SSR issues)
    if (process.env.NODE_ENV === 'production') {
      import('@sentry/nextjs')
        .then((Sentry) => {
          const id = Sentry.captureException(error, {
            level: 'fatal', // Global errors are critical
            tags: {
              errorBoundary: 'global',
            },
          });
          setEventId(id);
        })
        .catch((err) => {
          console.warn('Failed to load Sentry:', err);
        });
    } else {
      setEventId('dev-mode');
    }
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-dvh pad-safe-t pad-safe-b flex items-center justify-center p-6 bg-gray-50 dark:bg-[rgb(var(--bg))]">
          <div className="max-w-lg w-full bg-white dark:bg-[rgb(var(--surface))] rounded-lg shadow-lg p-6 border border-gray-200 dark:border-[rgb(var(--border-strong))]">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-500 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
                Application Error
              </h2>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 break-words mb-4">
              {error?.message || t('errors.globalError')}
            </p>
            {eventId ? (
              <div className="mb-4 rounded-md border border-dashed border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100">
                <p className="font-semibold mb-1">
                  {t('errors.referenceCode', { defaultValue: 'Reference code' })}: {eventId}
                </p>
                <button
                  className="btn-levitate text-xs"
                  onClick={() => navigator.clipboard.writeText(eventId)}
                >
                  {t('errors.copyCode', { defaultValue: 'Copy code' })}
                </button>
              </div>
            ) : null}
            <div className="flex gap-2 justify-end">
              <a
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                href={`mailto:${supportEmail}?subject=Tracker%20global%20error%20${eventId ?? ''}`}
              >
                {t('errors.contactSupport', { defaultValue: 'Contact support' })}
              </a>
              <button
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white dark:text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition"
                onClick={() => reset()}
              >
                Reload Application
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
