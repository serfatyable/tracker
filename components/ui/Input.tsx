'use client';

import type { InputHTMLAttributes } from 'react';

type Props = InputHTMLAttributes<HTMLInputElement>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Input({ className, ...rest }: Props) {
  const base = 'input-levitate';
  return <input className={cx(base, className)} {...rest} />;
}
