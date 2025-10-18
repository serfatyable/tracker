'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { signOut } from '../lib/firebase/auth';
import { useCurrentUserProfile } from '../lib/hooks/useCurrentUserProfile';
import { useTomorrowLecturerReminder } from '../lib/hooks/useTomorrowLecturerReminder';

import Avatar from './ui/Avatar';

export default function TopBar() {
  const router = useRouter();
  const { data: me } = useCurrentUserProfile();
  const { t, i18n: i18next } = useTranslation();
  const { show, meeting } = useTomorrowLecturerReminder();

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth');
    } catch {
      // Sign out failed - silent failure
    }
  }

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
        /* noop */
      }
      setLang(next);
      try {
        i18next.changeLanguage(next);
      } catch {
        /* noop */
      }
      try {
        document.cookie = `i18n_lang=${next}; path=/; SameSite=Lax`;
      } catch {
        /* noop */
      }
      // Update document dir attribute
      try {
        document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = next;
      } catch {
        /* noop */
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
      dir="ltr"
      className={`sticky top-0 z-40 flex h-12 items-center justify-between px-4 transition-colors duration-200 bg-surface/95 text-fg shadow-elev1`}
    >
      <div className="flex items-center gap-2 text-base flex-shrink-0">
        <div className="relative h-7 w-7 overflow-hidden rounded-full ring border-primary-token shadow-[0_0_0_1px_rgba(0,0,0,0.04)] flex-shrink-0">
          <Image
            src="/logo.png"
            alt="Tracker logo"
            fill
            className="object-cover"
            sizes="28px"
            priority
          />
        </div>
        <span
          className="font-medium hidden sm:inline"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(210,216,224,0.95) 0%, rgba(160,170,184,0.92) 50%, rgba(110,120,135,0.9) 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            textShadow: '0 1px 2px rgba(0,0,0,0.45)',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            filter: 'none',
          }}
        >
          Tracker
        </span>
      </div>
      <nav className="flex items-center gap-1 sm:gap-2 flex-shrink min-w-0" aria-label="User menu">
        {show && meeting ? (
          <div className="hidden md:block rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-900 whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px]">
            {t('morningMeetings.lecturerReminder')} — {meeting?.title}
          </div>
        ) : null}
        {/* Morning Meetings tab moved to Sidebar */}
        <LangToggle />
        <div className="pill text-sm min-w-0">
          <Avatar name={me?.fullName} size={20} className="flex-shrink-0" />
          <span className="max-w-[12ch] sm:max-w-[16ch] truncate">
            {me?.fullName || me?.email || t('ui.user')}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="pill text-sm px-2 sm:px-3 py-1 whitespace-nowrap flex-shrink-0"
          aria-label={t('auth.signOut')}
        >
          <span className="hidden sm:inline">{t('auth.signOut')}</span>
          <span className="sm:hidden">{t('auth.signOut')}</span>
        </button>
      </nav>
    </header>
  );
}
