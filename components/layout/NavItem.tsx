"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType, SVGProps } from 'react';

export default function NavItem({ href, label, Icon }: { href: string; label: string; Icon?: ComponentType<SVGProps<SVGSVGElement>> }) {
	const pathname = usePathname();
	const active = pathname.startsWith(href);
	return (
		<Link href={href} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
			{Icon ? <Icon className="h-5 w-5" /> : null}
			<span>{label}</span>
		</Link>
	);
}
