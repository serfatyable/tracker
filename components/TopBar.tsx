'use client';
import { Bars3Icon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '../lib/hooks/useCurrentUserProfile';
import { useTomorrowLecturerReminder } from '../lib/hooks/useTomorrowLecturerReminder';

import Avatar from './ui/Avatar';

const MobileDrawer = dynamic(() => import('./layout/MobileDrawer'), { ssr: false });

export default function TopBar() {
  // Router retained only for future navigations; unused currently
  const { data: me } = useCurrentUserProfile();
  const { t, i18n: i18next } = useTranslation();
  const { show, meeting } = useTomorrowLecturerReminder();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setDrawerOpen(true);
    if (typeof window !== 'undefined') {
      window.addEventListener('tracker:open-drawer', onOpen as any);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('tracker:open-drawer', onOpen as any);
      }
    };
  }, []);

  // No sign-out action in TopBar; handled from MobileDrawer

  function LangToggle() {
    const [lang, setLang] = useState<'en' | 'he'>(() => {
      if (typeof window === 'undefined') return 'en';
      return (localStorage.getItem('i18n_lang') as 'en' | 'he') || 'en';
    });
    const onToggle = () => {
      const next = lang === 'en' ? 'he' : 'en';
      try {
        localStorage.setItem('i18n_lang', next);
      } catch {
        // Ignore localStorage errors (e.g., in private browsing)
      }
      setLang(next);
      try {
        i18next.changeLanguage(next);
      } catch {
        // Ignore i18n change errors
      }
      try {
        document.cookie = `i18n_lang=${next}; path=/; SameSite=Lax`;
      } catch {
        // Ignore cookie errors
      }
      try {
        document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = next;
      } catch {
        // Ignore DOM manipulation errors
      }
    };
    return (
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex items-center rounded-full border px-2 py-1 text-xs transition-colors duration-200 border-gray-300/60 text-gray-700 hover:bg-gray-100/60 dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))] dark:hover:bg-[rgb(var(--surface-elevated))]"
        aria-label={t('ui.toggleLanguage')}
        title={t('ui.language')}
      >
        {lang.toUpperCase()}
      </button>
    );
  }

  return (
    <header
      className={`sticky top-0 z-40 flex h-12 items-center justify-between px-2 transition-colors duration-200 bg-surface/95 text-fg shadow-elev1`}
    >
      <div className="flex items-center gap-2 text-base flex-shrink-0">
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface/70 lg:hidden pl-2"
          aria-label={t('ui.openMenu', { defaultValue: 'Open menu' })}
          onClick={() => setDrawerOpen(true)}
        >
          <Bars3Icon className="h-6 w-6" />
        </button>
        <span
          className="font-semibold sm:font-bold tracking-tight text-fg"
          aria-label="TRACKER"
        >
          TRACKER
        </span>
      </div>
      <nav className="flex items-center gap-1 sm:gap-2 flex-shrink min-w-0" aria-label="User menu">
        {show && meeting ? (
          <div className="hidden md:block rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
            {t('morningMeetings.lecturerReminder')} — {meeting?.title}
          </div>
        ) : null}
        <div className="hidden md:block">
          <LangToggle />
        </div>
        <div className="min-w-0">
          <Avatar name={me?.fullName} email={me?.email} size={32} className="h-8 w-8 rounded-full" />
        </div>
      </nav>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}
