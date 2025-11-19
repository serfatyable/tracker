'use client';
import { Bars3Icon, BellIcon, HomeIcon, MagnifyingGlassIcon, PlusIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { useTomorrowLecturerReminder } from '../lib/hooks/useTomorrowLecturerReminder';

import Avatar from './ui/Avatar';
import Button from './ui/Button';

const MobileDrawer = dynamic(() => import('./layout/MobileDrawer'), { ssr: false });

export default function TopBar() {
  // Router retained only for future navigations; unused currently
  const { data: me } = useCurrentUserProfile();
  const { t, i18n: i18next } = useTranslation();
  const { show, meeting } = useTomorrowLecturerReminder();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const role = me?.role ?? 'resident';

  const openCommandPalette = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('tracker:command-palette'));
  }, []);

  const homeHref = role === 'tutor' ? '/tutor' : role === 'admin' ? '/admin' : '/resident';
  const quickActionHref = role === 'tutor' ? '/tutor/tasks?view=inbox' : role === 'admin' ? '/admin/tasks' : '/resident/reflections?mode=new';
  const quickActionLabel = useMemo(() => {
    if (role === 'tutor') return t('ui.quickAdd.task', { defaultValue: 'Add task' });
    if (role === 'admin') return t('ui.quickAdd.record', { defaultValue: 'Add record' });
    return t('ui.quickAdd.log', { defaultValue: 'Log activity' });
  }, [role, t]);

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

  const handleQuickAction = useCallback(() => {
    router.push(quickActionHref);
  }, [router, quickActionHref]);

  return (
    <header className="topbar glass-panel">
      <div className="flex items-center gap-2 text-base flex-shrink-0 min-w-0">
        <button
          type="button"
          className="icon-button icon-button--primary"
          aria-label={t('ui.openMenu', { defaultValue: 'Open menu' })}
          onClick={() => setDrawerOpen(true)}
        >
          <Bars3Icon className="h-5 w-5" stroke="currentColor" />
        </button>
        <Link
          href={homeHref}
          className="home-chip"
          aria-label={t('ui.goHome', { defaultValue: 'Go to dashboard' })}
        >
          <HomeIcon className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">TRACKER</span>
        </Link>
      </div>
      <div className="flex items-center justify-center gap-2 min-w-0">
        {show && meeting ? (
          <button
            type="button"
            className="alert-chip"
            onClick={() => router.push('/morning-meetings')}
          >
            {t('morningMeetings.lecturerReminder')} · {meeting?.title}
          </button>
        ) : null}
      </div>
      <nav className="flex items-center gap-2 flex-shrink min-w-0" aria-label="User menu">
        <button
          type="button"
          className="command-button hidden sm:flex"
          onClick={openCommandPalette}
          aria-label={t('ui.search', { defaultValue: 'Search' })}
        >
          <MagnifyingGlassIcon className="h-5 w-5 flex-shrink-0" />
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            {t('ui.search', { defaultValue: 'Search' })}
            <kbd className="shortcut-kbd">⌘K</kbd>
          </span>
        </button>
        <button
          type="button"
          className="command-button sm:hidden"
          onClick={openCommandPalette}
          aria-label={t('ui.search', { defaultValue: 'Search' })}
        >
          <MagnifyingGlassIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="icon-button lg:hidden"
          onClick={handleQuickAction}
          aria-label={quickActionLabel}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
        <Button
          size="sm"
          className="hidden lg:inline-flex"
          leftIcon={<PlusIcon className="h-4 w-4" aria-hidden="true" />}
          onClick={handleQuickAction}
        >
          {quickActionLabel}
        </Button>
        <NotificationBell hasReminder={show} onClick={() => router.push('/morning-meetings')} />
        <div className="hidden sm:block">
          <LangToggle />
        </div>
        <div className="min-w-0">
          <Avatar
            name={me?.fullName || undefined}
            email={me?.email || undefined}
            size={32}
            className="h-8 w-8 rounded-full"
          />
        </div>
        <div className="sm:hidden">
          <LangToggle />
        </div>
      </nav>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </header>
  );
}

function NotificationBell({ hasReminder, onClick }: { hasReminder: boolean; onClick: () => void }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="icon-button relative"
      onClick={onClick}
      aria-label={t('ui.notifications', { defaultValue: 'Notifications' })}
    >
      <BellIcon className="h-5 w-5" aria-hidden="true" />
      {hasReminder ? <span className="notification-dot" aria-hidden="true" /> : null}
    </button>
  );
}
