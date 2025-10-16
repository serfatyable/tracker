'use client';

import i18n from 'i18next';
import { useEffect, useRef } from 'react';
import { initReactI18next } from 'react-i18next';

import en from '../../i18n/en.json';
import he from '../../i18n/he.json';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang =
    (typeof document !== 'undefined' && document.documentElement.lang) === 'he' ? 'he' : 'en';
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
