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

  const handleComingSoon = (feature: string) => {
    // Toast or modal could be added here in the future
    alert(`${feature} feature coming soon!`);
  };

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-primary-token/20 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85 text-fg px-2 py-2 md:hidden safe-area-inset-bottom"
      aria-label="Quick actions"
    >
      <button
        onClick={() => handleComingSoon(t('bottomNav.logSkill'))}
        className="flex flex-col items-center text-xs min-w-[60px] min-h-[48px] justify-center gap-1 hover:text-primary transition-colors cursor-pointer opacity-60"
        aria-label={`${t('bottomNav.logSkill')} (Coming Soon)`}
      >
        <ClipboardDocumentCheckIcon className="h-6 w-6" />
        <span className="truncate w-full text-center">{t('bottomNav.logSkill')}</span>
      </button>
      <button
        onClick={() => handleComingSoon(t('bottomNav.logCase'))}
        className="flex flex-col items-center text-xs min-w-[60px] min-h-[48px] justify-center gap-1 hover:text-primary transition-colors cursor-pointer opacity-60"
        aria-label={`${t('bottomNav.logCase')} (Coming Soon)`}
      >
        <PlusCircleIcon className="h-6 w-6" />
        <span className="truncate w-full text-center">{t('bottomNav.logCase')}</span>
      </button>
      <Link
        href="/resident?tab=rotations"
        className="flex flex-col items-center text-xs min-w-[60px] min-h-[48px] justify-center gap-1 hover:text-primary transition-colors cursor-pointer"
      >
        <MagnifyingGlassIcon className="h-6 w-6" />
        <span className="truncate w-full text-center">{t('bottomNav.search')}</span>
      </Link>
      <Link
        href="/on-call"
        className="flex flex-col items-center text-xs min-w-[60px] min-h-[48px] justify-center gap-1 hover:text-primary transition-colors cursor-pointer"
      >
        <CalendarDaysIcon className="h-6 w-6" />
        <span className="truncate w-full text-center">
          {t('ui.onCall', { defaultValue: 'On Call' })}
        </span>
      </Link>
    </nav>
  );
}
