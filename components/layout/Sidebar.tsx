"use client";
import { HomeIcon, Cog6ToothIcon, UserGroupIcon } from '@heroicons/react/24/outline';

import NavItem from './NavItem';

export default function Sidebar() {
	return (
		<aside className="hidden w-64 flex-shrink-0 border-r bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:block">
			<nav className="space-y-1">
				<NavItem href="/resident" label="Dashboard" Icon={HomeIcon} />
				<NavItem href="/auth" label="Auth" Icon={UserGroupIcon} />
				<NavItem href="/settings" label="Settings" Icon={Cog6ToothIcon} />
			</nav>
		</aside>
	);
}
