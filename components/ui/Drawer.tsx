'use client';

import type { ReactNode } from 'react';

type Side = 'right' | 'left';

export function Drawer({
  open,
  onClose,
  side = 'right',
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  side?: Side;
  children: ReactNode;
  title?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} role="presentation" />
      <div
        className={
          'absolute top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform dark:bg-[rgb(var(--surface))] overflow-hidden ' +
          (side === 'right' ? 'right-0' : 'left-0')
        }
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b p-3 sm:p-4 dark:border-[rgb(var(--border))] flex-shrink-0">
          <div className="text-sm font-semibold truncate pr-2">{title}</div>
          <button
            className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:text-[rgb(var(--muted))] dark:hover:bg-[rgb(var(--surface-elevated))] focus:outline-none focus:ring-2 focus:ring-primary transition-colors cursor-pointer flex-shrink-0 min-w-[40px] min-h-[40px] flex items-center justify-center"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="h-[calc(100%-56px)] sm:h-[calc(100%-64px)] overflow-y-auto p-3 sm:p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Drawer;
