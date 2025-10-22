'use client';

import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  name?: string; // displayName or full name preferred
  email?: string; // used as fallback for initials
  size?: number; // in px
};

function getInitials(input?: { name?: string; email?: string }): string {
  const source = ((): string => {
    if (input?.name && input.name.trim()) return input.name.trim();
    const local = input?.email?.split('@')[0] || '';
    return local.trim();
  })();
  if (!source) return '?';
  // Normalize: trim, collapse whitespace, remove non-letters
  const normalized = source
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\p{L}\s]/gu, '')
    .trim();
  if (!normalized) return '?';
  const tokens = normalized.split(' ').filter(Boolean);
  const first = tokens[0]?.[0] || '';
  const last = (tokens.length > 1 ? tokens[tokens.length - 1] : '')?.[0] || '';
  const letters = (first + last || first).toUpperCase();
  // Force LTR for pill text while keeping only letters, max 2 chars
  const two = letters.slice(0, 2);
  return two || '?';
}

export default function Avatar({ name, email, size = 28, className, ...rest }: Props) {
  const initials = getInitials({ name, email });
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
      <span dir="ltr">{initials}</span>
    </div>
  );
}
