'use client';

import type { ReactNode } from 'react';

export function Tabs({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function TabsList({ children }: { children: ReactNode }) {
  return (
    <div role="tablist" className="flex flex-wrap items-center gap-2">
      {children}
    </div>
  );
}

export function TabsTrigger({
  active,
  onClick,
  children,
  disabled,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={!!active}
      disabled={disabled}
      className={
        'tab-levitate px-3 py-2.5 text-sm text-fg relative overflow-hidden cursor-pointer min-h-[44px] ' +
        'transition duration-150 ease-out will-change-transform flex items-center justify-center ' +
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ' +
        (active ? 'ring-1 ring-primary font-medium' : '') +
        (disabled ? ' opacity-60 cursor-not-allowed' : ' hover:bg-surface/50')
      }
      onClick={onClick}
    >
      <span className="relative z-10">{children}</span>
      {!disabled && (
        <span
          aria-hidden
          className={
            'pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 ease-out ' +
            'bg-gradient-to-b from-white/0 to-white/30 dark:from-white/0 dark:to-white/10 hover:opacity-100'
          }
        />
      )}
    </button>
  );
}

export function TabsContent({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  if (hidden) return null;
  return <div className="pt-4">{children}</div>;
}
