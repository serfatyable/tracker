"use client";

import type { ReactNode } from 'react';

type TabKey = string;

export function Tabs({ children }: { children: ReactNode }) {
    return <div>{children}</div>;
}

export function TabsList({ children }: { children: ReactNode }) {
    return <div className="flex items-center gap-2 border-b border-gray-200 dark:border-gray-800">{children}</div>;
}

export function TabsTrigger({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
    return (
        <button
            type="button"
            className={
                "px-3 py-2 text-sm transition border-b-2 -mb-px " +
                (active ? "border-teal-600 text-teal-700 dark:text-teal-400" : "border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-300")
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


