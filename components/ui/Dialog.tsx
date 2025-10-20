'use client';

import { type ReactNode } from 'react';

export function Dialog({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full h-[100svh] sm:h-auto sm:max-w-lg sm:rounded-lg bg-white dark:bg-[rgb(var(--surface))] text-gray-900 dark:text-[rgb(var(--fg))] p-4 sm:p-6 shadow-2xl border border-gray-200 dark:border-[rgb(var(--border-strong))] focus:outline-none max-h-[100svh] sm:max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="mb-2 text-base font-semibold">{children}</div>;
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}
