'use client';

import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Input({ className, disabled, ...rest }: Props) {
  const base =
    'input-levitate placeholder:opacity-70 placeholder:text-[rgb(var(--fg))] transition-colors';
  const light = 'bg-white text-[rgb(var(--fg))] border-[rgb(var(--muted))/30]';
  const dark = 'bg-[rgb(17,24,39)]/90 text-white border-white/30';
  const states = disabled
    ? 'opacity-60 cursor-not-allowed'
    : 'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  return (
    <input
      className={cx(base, light, 'dark:' + dark, states, className)}
      disabled={disabled}
      {...rest}
    />
  );
}
