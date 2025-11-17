import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { ReactNode } from 'react';

import Button from './Button';

type ErrorStateProps = {
  title?: string;
  description?: string | ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: ReactNode;
  className?: string;
};

export default function ErrorState({
  title = 'Something went wrong',
  description = 'An error occurred while loading this content.',
  onRetry,
  retryLabel = 'Try again',
  icon,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        {icon || <ExclamationTriangleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />}
      </div>
      <h3 className="text-lg font-semibold text-[rgb(var(--fg))] mb-2">{title}</h3>
      {typeof description === 'string' ? (
        <p className="text-sm text-[rgb(var(--muted))] max-w-md mb-6">{description}</p>
      ) : (
        <div className="text-sm text-[rgb(var(--muted))] max-w-md mb-6">{description}</div>
      )}
      {onRetry && (
        <Button onClick={onRetry} variant="outline">
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
