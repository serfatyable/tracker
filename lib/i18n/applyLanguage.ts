export function applyLanguageToDocument(lang: 'en' | 'he') {
  if (typeof window === 'undefined') return;
  localStorage.setItem('i18n_lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}
