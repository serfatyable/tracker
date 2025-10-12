"use client";
import TopBar from '../TopBar';

import BottomBar from './BottomBar';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
	return (
		<div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
			<div className="sticky top-0 z-40 bg-white dark:bg-gray-950">
				<TopBar />
			</div>
			<div className="mx-auto flex w-full max-w-6xl">
				<Sidebar />
				<main className="flex-1 p-4 md:p-6">{children}</main>
			</div>
			<BottomBar />
		</div>
	);
}
