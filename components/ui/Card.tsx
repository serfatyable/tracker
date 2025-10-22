'use client';

import type { HTMLAttributes, ReactNode } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
};

export default function Card({ title, subtitle, actions, className, children, ...rest }: Props) {
  return (
    <section
      className={[
        'rounded-lg bg-bg text-fg ring-1 ring-muted/12 transition',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.03),0_1px_2px_rgba(0,0,0,0.08)]',
        'hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_20px_-6px_rgba(0,0,0,0.18),0_4px_8px_-4px_rgba(0,0,0,0.14)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {(title || actions || subtitle) && (
        <header className="flex items-start justify-between gap-3 border-b border-muted/15 p-4">
          <div>
            {title ? <h2 className="text-base font-semibold leading-6 text-foreground dark:text-white">{title}</h2> : null}
            {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
