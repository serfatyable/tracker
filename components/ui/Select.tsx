'use client';

import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/lib/utils/cn';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

export default function Select({ className, disabled, ...rest }: Props) {
  const base = 'input-levitate transition-colors cursor-pointer';
  const light = 'bg-white text-[rgb(var(--fg))] border-[rgb(var(--muted))/30]';
  const dark = 'dark:bg-[rgb(17,24,39)]/90 dark:text-white dark:border-white/30';
  const states = disabled
    ? 'opacity-60 cursor-not-allowed'
    : 'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  return (
    <select className={cn(base, light, dark, states, className)} disabled={disabled} {...rest} />
  );
}
