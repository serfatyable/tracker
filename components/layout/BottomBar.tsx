"use client";
import { PlusCircleIcon, MagnifyingGlassIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function BottomBar() {
	return (
		<nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t bg-white px-4 py-2 dark:border-gray-800 dark:bg-gray-950 md:hidden">
			<Link href="#" className="flex flex-col items-center text-sm">
				<ClipboardDocumentCheckIcon className="h-6 w-6" />
				<span>Log Skill</span>
			</Link>
			<Link href="#" className="flex flex-col items-center text-sm">
				<PlusCircleIcon className="h-6 w-6" />
				<span>Log Case</span>
			</Link>
			<Link href="#" className="flex flex-col items-center text-sm">
				<MagnifyingGlassIcon className="h-6 w-6" />
				<span>Search</span>
			</Link>
		</nav>
	);
}
