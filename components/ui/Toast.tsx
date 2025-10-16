'use client';
import { useEffect, useState } from 'react';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type Props = {
  message: string | null;
  variant?: ToastVariant;
  onClear?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
};

export default function Toast({
  message,
  variant = 'info',
  onClear,
  actionLabel,
  onAction,
  duration = 3500,
}: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (message) {
      setOpen(true);
      const id = setTimeout(() => {
        setOpen(false);
        onClear?.();
      }, duration);
      return () => clearTimeout(id);
    }
  }, [message, onClear, duration]);

  if (!message) return null;

  const variants: Record<ToastVariant, string> = {
    success:
      'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    error:
      'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200',
    warning:
      'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    info: 'bg-surface border-muted/20 text-fg',
  };

  const icons: Record<ToastVariant, string> = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={
        'pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 transform transition-all duration-300 ' +
        (open ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2')
      }
    >
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-3 rounded-md border px-4 py-3 text-sm shadow-elev2 ${variants[variant]}`}
      >
        <span className="flex-shrink-0 text-base font-semibold" aria-hidden="true">
          {icons[variant]}
        </span>
        <span className="flex-1">{message}</span>
        {actionLabel && onAction ? (
          <button
            className="rounded bg-primary px-2 py-1 text-xs font-medium text-[rgb(var(--primary-ink))] hover:bg-primary/90 transition-colors cursor-pointer"
            onClick={() => {
              onAction?.();
              setOpen(false);
              onClear?.();
            }}
          >
            {actionLabel}
          </button>
        ) : null}
        <button
          className="flex-shrink-0 ml-2 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={() => {
            setOpen(false);
            onClear?.();
          }}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
