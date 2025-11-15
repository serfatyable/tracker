'use client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
// @ts-ignore - react-dom types not available
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

import { signOutAndRedirect } from '../../lib/firebase/auth';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';

import NavItem from './NavItem';

export default function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { data: me } = useCurrentUserProfile();
  const { t, i18n: i18next } = useTranslation();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [lang, setLang] = useState<'en' | 'he'>(() => {
    if (typeof window === 'undefined') return 'en';
    return (localStorage.getItem('i18n_lang') as 'en' | 'he') || 'en';
  });

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus the first focusable in panel
    const first = panelRef.current?.querySelector<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
    // Simple focus trap
    const onTrap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusables || focusables.length === 0) return;
      const list = Array.from(focusables).filter(
        (el) => !el.hasAttribute('disabled'),
      ) as HTMLElement[];
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (!firstEl || !lastEl) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (active === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener('keydown', onTrap);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keydown', onTrap);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    // Close drawer on route change
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  const role = me?.role || 'resident';
  const homeHref = role === 'admin' ? '/admin' : role === 'tutor' ? '/tutor' : '/resident';
  const reflectionsHref =
    role === 'admin'
      ? '/admin/reflections'
      : role === 'tutor'
        ? '/tutor/reflections'
        : '/resident/reflections';
  const rotationsHref =
    role === 'admin'
      ? '/admin/rotations'
      : role === 'tutor'
        ? '/tutor/rotations'
        : '/resident/rotations';
  const residentsHref = role === 'resident' ? '/resident' : '/residents';

  const isRTL = typeof window !== 'undefined' && document?.documentElement?.dir === 'rtl';

  const onToggleLang = () => {
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
    try {
      document.documentElement.dir = next === 'he' ? 'rtl' : 'ltr';
      document.documentElement.lang = next;
    } catch {
      /* noop */
    }
  };

  const onSignOut = async () => {
    try {
      await signOutAndRedirect();
    } catch {
      /* noop */
    }
  };

  const drawer = (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-80 max-w-[85vw] bg-white/70 dark:bg-neutral-900/80 backdrop-blur-md border border-black/5 dark:border-white/10 shadow-lg shadow-black/5 text-foreground dark:text-white overscroll-contain focus:outline-none flex flex-col`}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-muted/20">
          <span className="font-medium text-foreground dark:text-white">
            {t('ui.menu', { defaultValue: 'Menu' })}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-foreground dark:text-white"
            aria-label={t('ui.close')}
          >
            <XMarkIcon className="h-6 w-6" stroke="currentColor" />
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          <NavItem href={homeHref} label={t('ui.dashboard')} />
          {(role === 'admin' || role === 'tutor') && (
            <NavItem
              href={residentsHref}
              label={t('tutor.tabs.residents', { defaultValue: 'Residents' })}
            />
          )}
          <NavItem href={reflectionsHref} label={t('ui.reflections')} />
          <NavItem href={rotationsHref} label={t('ui.rotations', { defaultValue: 'Rotations' })} />
          <NavItem href="/exams" label={t('exams.title', { defaultValue: 'Exams' })} />
          <NavItem href="/morning-meetings" label={t('ui.morningMeetings')} />
          <NavItem href="/on-call" label={t('ui.onCall')} />
          {role === 'admin' && (
            <NavItem
              href="/admin/users"
              label={t('ui.userManagement', { defaultValue: 'User Management' })}
            />
          )}
          <NavItem href="/settings" label={t('ui.settings')} />
        </nav>
        <div className="p-3 border-t border-muted/20 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            className="tab-levitate text-sm text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
            aria-label={t('ui.toggleLanguage')}
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="tab-levitate text-sm text-foreground dark:text-white hover:bg-black/5 dark:hover:bg-white/5"
            aria-label={t('auth.signOut')}
          >
            {t('auth.signOut')}
          </button>
        </div>
      </div>
    </div>
  );

  // Render via portal to escape TopBar stacking context
  if (typeof window !== 'undefined' && document?.body) {
    return createPortal(drawer, document.body);
  }
  return drawer;
}
