import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '../../i18n/en.json';
import he from '../../i18n/he.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('i18n_lang') : null;
const lng = savedLang === 'he' ? 'he' : 'en';

i18n
	.use(initReactI18next)
	.init({
		resources: { en: { translation: en }, he: { translation: he } },
		lng,
		fallbackLng: 'en',
		interpolation: { escapeValue: false },
	});

export default i18n;
