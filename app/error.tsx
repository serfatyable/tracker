'use client';

import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  const { t } = useTranslation();
  useEffect(() => {
    // Log the error to console (in production, you might want to send to an error tracking service)
    console.error('Route error caught by error boundary:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <div className="card-levitate max-w-lg w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-8 w-8 text-red-500"
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 break-words mb-4">
          {error?.message || t('errors.unexpectedError')}
        </p>
        {process.env.NODE_ENV === 'development' && error?.stack && (
          <details className="mb-4">
            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300">
              View error details
            </summary>
            <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
              {error.stack}
            </pre>
          </details>
        )}
        <div className="flex gap-2 justify-end">
          <button
            className="btn-levitate border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
            onClick={() => (window.location.href = '/')}
          >
            Go Home
          </button>
          <button className="btn-levitate" onClick={() => reset()}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
