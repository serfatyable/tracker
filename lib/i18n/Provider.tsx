"use client";

import i18n from 'i18next';
import { useEffect, useState } from 'react';
import { initReactI18next } from 'react-i18next';

import en from '../../i18n/en.json';
import he from '../../i18n/he.json';

export function I18nProvider({ children }: { children: React.ReactNode }) {
	const [ready, setReady] = useState(false);

	useEffect(() => {
		let isMounted = true;
		(async () => {
			const savedLang = (typeof window !== 'undefined' && localStorage.getItem('i18n_lang')) || 'en';
			if (!i18n.isInitialized) {
				await i18n.use(initReactI18next).init({
					resources: { en: { translation: en }, he: { translation: he } },
					lng: savedLang === 'he' ? 'he' : 'en',
					fallbackLng: 'en',
					interpolation: { escapeValue: false },
				});
			}
			if (isMounted) setReady(true);
		})();
		return () => {
			isMounted = false;
		};
	}, []);

	if (!ready) return null;
	return children as any;
}


