'use client';

import i18n from 'i18next';
import { useEffect, useRef } from 'react';
import { initReactI18next } from 'react-i18next';

import en from '../../i18n/en.json';
import he from '../../i18n/he.json';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Get language from document OR localStorage as fallback
  const lang = (() => {
    if (typeof document === 'undefined') return 'en';
    const docLang = document.documentElement.lang;
    if (docLang === 'he' || docLang === 'en') return docLang as 'he' | 'en';
    // Fallback to localStorage if document lang not set properly
    try {
      const stored = localStorage.getItem('i18n_lang');
      return (stored === 'he' ? 'he' : 'en') as 'he' | 'en';
    } catch {
      return 'en' as 'he' | 'en';
    }
  })();

  const isInitialized = useRef(false);

  // Initialize i18n once during render (before first useEffect)
  if (!isInitialized.current && !i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, he: { translation: he } },
      lng: lang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
    isInitialized.current = true;
  }

  // Update language in useEffect to avoid state updates during render
  useEffect(() => {
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    // Also ensure dir is set correctly
    document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    try {
      document.cookie = `i18n_lang=${lang}; path=/; SameSite=Lax`;
    } catch {
      /* noop */
    }
  }, [lang]);

  return children as any;
}
