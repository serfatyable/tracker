"use client";
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { signOut } from '../lib/firebase/auth';

export default function TopBar() {
	const router = useRouter();
	async function handleSignOut() {
		try {
			await signOut();
			router.replace('/auth');
		} catch {
			console.error('Sign out failed');
		}
	}
	return (
		<header dir="ltr" className="flex items-center justify-between border-b bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
			<div className="flex items-center gap-2 text-lg font-semibold">
				<Image src="/logo.jpg" alt="Tracker" width={32} height={32} className="rounded-full object-cover ring-1 ring-gray-300 dark:ring-gray-600" />
				<span>Tracker</span>
			</div>
			<nav className="flex items-center gap-3">
				<button onClick={handleSignOut} className="btn-levitate">Sign out</button>
			</nav>
		</header>
	);
}
