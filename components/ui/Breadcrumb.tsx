import { ChevronRightIcon, HomeIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { ReactNode } from 'react';

type BreadcrumbItem = {
  label: string;
  href?: string;
  current?: boolean;
};

type BreadcrumbProps = {
  items: BreadcrumbItem[];
  showHome?: boolean;
  homeHref?: string;
  className?: string;
};

export default function Breadcrumb({
  items,
  showHome = true,
  homeHref = '/',
  className = '',
}: BreadcrumbProps) {
  return (
    <nav className={`flex items-center space-x-2 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-2">
        {showHome && (
          <li>
            <Link
              href={homeHref}
              className="flex items-center text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
              aria-label="Home"
            >
              <HomeIcon className="h-4 w-4" />
            </Link>
          </li>
        )}

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isCurrent = item.current || isLast;

          return (
            <li key={index} className="flex items-center space-x-2">
              {(showHome || index > 0) && (
                <ChevronRightIcon
                  className="h-4 w-4 text-[rgb(var(--muted))] rtl:flip-x"
                  aria-hidden="true"
                />
              )}
              {item.href && !isCurrent ? (
                <Link
                  href={item.href}
                  className="text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  className="font-medium text-[rgb(var(--fg))]"
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// Convenience component for single breadcrumb item
export function BreadcrumbItem({
  href,
  current,
  children,
}: {
  href?: string;
  current?: boolean;
  children: ReactNode;
}) {
  if (href && !current) {
    return (
      <Link
        href={href}
        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--fg))] transition-colors"
      >
        {children}
      </Link>
    );
  }

  return (
    <span className="font-medium text-[rgb(var(--fg))]" aria-current={current ? 'page' : undefined}>
      {children}
    </span>
  );
}
