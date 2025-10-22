'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';

export default function NavItem({
  href,
  label,
  Icon,
}: {
  href: string;
  label: string;
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  const pathname = usePathname();
  const active = pathname.startsWith(href);
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/5 ${active ? 'bg-surface text-fg ring-1 ring-primary' : ''}`}
    >
      {Icon ? <Icon className="h-5 w-5" stroke="currentColor" /> : null}
      <span>{label}</span>
    </Link>
  );
}
