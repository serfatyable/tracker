'use client';
import { useEffect, useState } from 'react';

type Props = {
  message: string | null;
  onClear?: () => void;
  actionLabel?: string;
  onAction?: () => void;
};

export default function Toast({ message, onClear, actionLabel, onAction }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (message) {
      setOpen(true);
      const id = setTimeout(() => {
        setOpen(false);
        onClear?.();
      }, 3500);
      return () => clearTimeout(id);
    }
  }, [message, onClear]);
  if (!message) return null;
  return (
    <div
      className={
        'pointer-events-none fixed left-1/2 top-4 z-50 -translate-x-1/2 transform transition-opacity ' +
        (open ? 'opacity-100' : 'opacity-0')
      }
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex items-center gap-3 rounded border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
      >
        <span>{message}</span>
        {actionLabel && onAction ? (
          <button
            className="rounded bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-700"
            onClick={() => {
              onAction?.();
              setOpen(false);
              onClear?.();
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
