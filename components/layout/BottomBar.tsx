'use client';
import {
  PlusCircleIcon,
  MagnifyingGlassIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

export default function BottomBar() {
  const { t } = useTranslation();
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
      <Link href="/on-call" className="flex flex-col items-center text-sm">
        <CalendarDaysIcon className="h-6 w-6" />
        <span>{t('ui.onCall', { defaultValue: 'On Call' })}</span>
      </Link>
    </nav>
  );
}
