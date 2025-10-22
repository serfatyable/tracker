'use client';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { signOutAndRedirect } from '../../lib/firebase/auth';

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
      const firstEl = list[0]!;
      const lastEl = list[list.length - 1]!;
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
    <div className="fixed inset-0 z-[120] md:hidden" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} w-80 max-w-[85vw] bg-white/70 dark:bg-neutral-900/70 backdrop-blur-md border border-black/5 shadow-lg shadow-black/5 text-fg overscroll-contain focus:outline-none flex flex-col`}
        tabIndex={-1}
      >
        <div className="flex items-center justify-between px-3 py-3 border-b border-muted/20">
          <span className="font-medium">{t('ui.menu', { defaultValue: 'Menu' })}</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-md hover:bg-surface/70"
            aria-label={t('ui.close')}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto text-opacity-100">
          <NavItem href={homeHref} label={t('ui.dashboard')} />
          <NavItem href={reflectionsHref} label={t('ui.reflections')} />
          <NavItem href="/morning-meetings" label={t('ui.morningMeetings')} />
          <NavItem href="/on-call" label={t('ui.onCall')} />
          <NavItem href="/settings" label={t('ui.settings')} />
        </nav>
        <div className="p-3 border-t border-muted/20 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleLang}
            className="tab-levitate text-sm"
            aria-label={t('ui.toggleLanguage')}
          >
            {lang.toUpperCase()}
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className="tab-levitate text-sm"
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
