'use client';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

import { signOut } from '../lib/firebase/auth';
import { useCurrentUserProfile } from '../lib/hooks/useCurrentUserProfile';
import Avatar from './ui/Avatar';
import { useTranslation } from 'react-i18next';

export default function TopBar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const { data: me } = useCurrentUserProfile();
  const { i18n: i18next } = useTranslation();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  async function handleSignOut() {
    try {
      await signOut();
      router.replace('/auth');
    } catch {
      console.error('Sign out failed');
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
      } catch (_err) {
        /* noop */
      }
      setLang(next);
      try {
        i18next.changeLanguage(next);
      } catch (_err) {
        /* noop */
      }
      try {
        document.cookie = `i18n_lang=${next}; path=/; SameSite=Lax`;
      } catch (_err) {
        /* noop */
      }
    };
    return (
      <button
        type="button"
        onClick={onToggle}
        className="relative inline-flex items-center rounded-full border px-2 py-1 text-xs transition-colors duration-200 border-gray-300/60 text-gray-700 hover:bg-gray-100/60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        aria-label="Toggle language"
        title="Language"
      >
        {lang.toUpperCase()}
      </button>
    );
  }

  return (
    <header
      dir="ltr"
      className={`sticky top-0 z-40 flex h-12 items-center justify-between px-4 backdrop-blur-md transition-colors duration-200 ${
        scrolled
          ? 'bg-white/70 shadow-[0_8px_16px_-12px_rgba(0,0,0,0.25)] dark:bg-[#121212]/70'
          : 'bg-white/40 dark:bg-[#121212]/40'
      }`}
    >
      <div className="flex items-center gap-2 text-base">
        <div className="relative h-7 w-7 overflow-hidden rounded-full ring-1 ring-[rgba(0,0,0,0.06)] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
          <Image src="/logo.jpg" alt="Tracker" fill className="object-cover" sizes="28px" />
        </div>
        <span className="font-medium text-gray-600 dark:text-gray-300">Tracker</span>
      </div>
      <nav className="flex items-center gap-2">
        <LangToggle />
        <div className="flex items-center gap-2 rounded-full border px-2 py-1 text-sm transition hover:bg-[rgba(0,150,255,0.08)] border-[rgba(0,87,184,0.35)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]">
          <Avatar name={me?.fullName} size={20} />
          <span className="max-w-[12ch] truncate">{me?.fullName || me?.email || 'User'}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="rounded-md border px-3 py-1 text-sm transition hover:bg-[rgba(0,150,255,0.08)] border-[rgba(0,87,184,0.35)] text-[rgba(0,87,184,0.95)] dark:text-[rgba(0,150,255,0.95)]"
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
