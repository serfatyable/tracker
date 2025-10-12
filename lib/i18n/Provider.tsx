'use client';

import i18n from 'i18next';
import { useEffect } from 'react';
import { initReactI18next } from 'react-i18next';

import en from '../../i18n/en.json';
import he from '../../i18n/he.json';

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const lang =
    (typeof document !== 'undefined' && document.documentElement.lang) === 'he' ? 'he' : 'en';
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, he: { translation: he } },
      lng: lang,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
    });
  } else {
    i18n.changeLanguage(lang);
  }

  useEffect(() => {
    try {
      document.cookie = `i18n_lang=${lang}; path=/; SameSite=Lax`;
    } catch (_err) {
      /* noop */
    }
  }, [lang]);

  return children as any;
}
