'use client';

import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Select({ className, disabled, ...rest }: Props) {
  const base = 'input-levitate transition-colors cursor-pointer';
  const light = 'bg-white text-[rgb(var(--fg))] border-[rgb(var(--muted))/30]';
  const dark = 'dark:bg-[rgb(17,24,39)]/90 dark:text-white dark:border-white/30';
  const states = disabled
    ? 'opacity-60 cursor-not-allowed'
    : 'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  return (
    <select className={cx(base, light, dark, states, className)} disabled={disabled} {...rest} />
  );
}
