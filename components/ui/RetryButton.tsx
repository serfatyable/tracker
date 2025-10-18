/**
 * Reusable retry button component for error states
 */

'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from './Button';

interface RetryButtonProps {
  /** Function to call when retry is clicked */
  onRetry: () => Promise<void> | void;
  /** Custom retry label */
  label?: string;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'outline' | 'ghost' | 'secondary';
  /** Disabled state */
  disabled?: boolean;
  /** Custom icon */
  icon?: React.ReactNode;
  /** Show loading spinner during retry */
  showLoading?: boolean;
}

export default function RetryButton({
  onRetry,
  label,
  size = 'sm',
  variant = 'outline',
  disabled = false,
  showLoading = true,
  icon,
}: RetryButtonProps) {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying || disabled) return;

    try {
      setIsRetrying(true);
      await onRetry();
    } catch (error) {
      // Let the parent component handle the error
      console.warn('Retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const defaultIcon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );

  return (
    <Button
      onClick={handleRetry}
      disabled={disabled || isRetrying}
      size={size}
      variant={variant}
      className="inline-flex items-center gap-2"
    >
      {showLoading && isRetrying ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        icon || defaultIcon
      )}
      {label || t('ui.tryAgain', { defaultValue: 'Try Again' })}
    </Button>
  );
}

/**
 * Error state with retry functionality
 */
interface ErrorWithRetryProps {
  /** Error message to display */
  message: string;
  /** Function to call when retry is clicked */
  onRetry: () => Promise<void> | void;
  /** Optional title */
  title?: string;
  /** Custom retry button label */
  retryLabel?: string;
  /** Additional content */
  children?: React.ReactNode;
}

export function ErrorWithRetry({
  message,
  onRetry,
  title,
  retryLabel,
  children,
}: ErrorWithRetryProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-4">
        <svg
          className="w-12 h-12 text-red-500 mx-auto mb-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        {title && (
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
        )}
        <p className="text-sm text-gray-600 dark:text-[rgb(var(--muted))] mb-4">{message}</p>
      </div>

      <RetryButton onRetry={onRetry} label={retryLabel} size="md" variant="outline" />

      {children && <div className="mt-4 text-xs text-gray-500">{children}</div>}
    </div>
  );
}

/**
 * Compact inline retry for smaller spaces
 */
interface InlineRetryProps {
  /** Function to call when retry is clicked */
  onRetry: () => Promise<void> | void;
  /** Error message */
  message: string;
  /** Show as link instead of button */
  asLink?: boolean;
}

export function InlineRetry({ onRetry, message, asLink = false }: InlineRetryProps) {
  const { t } = useTranslation();
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (isRetrying) return;

    try {
      setIsRetrying(true);
      await onRetry();
    } catch (error) {
      console.warn('Inline retry failed:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  if (asLink) {
    return (
      <div className="text-sm text-gray-600 dark:text-[rgb(var(--muted))]">
        {message}{' '}
        <button
          onClick={handleRetry}
          disabled={isRetrying}
          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 underline disabled:opacity-50"
        >
          {isRetrying
            ? t('ui.retrying', { defaultValue: 'Retrying...' })
            : t('ui.tryAgain', { defaultValue: 'Try again' })}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600 dark:text-[rgb(var(--muted))]">{message}</span>
      <RetryButton onRetry={onRetry} size="sm" showLoading={false} />
    </div>
  );
}
