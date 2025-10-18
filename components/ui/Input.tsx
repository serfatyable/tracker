'use client';

import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Input({ className, disabled, ...rest }: Props) {
  const base =
    'input-levitate placeholder:opacity-70 transition-colors';
  const light = 'bg-white text-gray-900 placeholder:text-gray-500 border-gray-300';
  const dark = 'dark:bg-[rgb(var(--surface-depressed))] dark:text-[rgb(var(--fg))] dark:placeholder:text-[rgb(var(--muted))] dark:border-[rgb(var(--border))]';
  const states = disabled
    ? 'opacity-60 cursor-not-allowed'
    : 'hover:border-primary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20';
  return (
    <input
      className={cx(base, light, dark, states, className)}
      disabled={disabled}
      {...rest}
    />
  );
}
