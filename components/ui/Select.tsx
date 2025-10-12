'use client';

import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement>;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Select({ className, ...rest }: Props) {
  const base = 'input-levitate';
  return <select className={cx(base, className)} {...rest} />;
}
