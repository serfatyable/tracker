'use client';

import type { ReactNode } from 'react';

type TabKey = string;

export function Tabs({ children }: { children: ReactNode }) {
  return <div>{children}</div>;
}

export function TabsList({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function TabsTrigger({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={
        'tab-levitate px-3 py-2 text-sm transition ' + (active ? 'ring-1 ring-blue-500' : '')
      }
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function TabsContent({ hidden, children }: { hidden?: boolean; children: ReactNode }) {
  if (hidden) return null;
  return <div className="pt-4">{children}</div>;
}
