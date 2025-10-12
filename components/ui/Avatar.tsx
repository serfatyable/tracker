'use client';

import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  name?: string;
  size?: number; // in px
};

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase()).join('');
  return initials || '?';
}

export default function Avatar({ name, size = 28, className, ...rest }: Props) {
  const initials = getInitials(name);
  const style = { width: size, height: size } as any;
  return (
    <div
      className={
        'inline-flex items-center justify-center rounded-full bg-teal-600/10 text-teal-700 dark:bg-teal-500/20 dark:text-teal-200 text-xs font-semibold ' +
        (className || '')
      }
      style={style}
      aria-label={name || 'avatar'}
      {...rest}
    >
      {initials}
    </div>
  );
}
