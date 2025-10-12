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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={
          'absolute top-0 h-full w-full max-w-md bg-white shadow-xl transition-transform dark:bg-gray-900 ' +
          (side === 'right' ? 'right-0' : 'left-0')
        }
      >
        <div className="flex items-center justify-between border-b p-4 dark:border-gray-800">
          <div className="text-sm font-semibold">{title}</div>
          <button
            className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="h-[calc(100%-52px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

export default Drawer;
