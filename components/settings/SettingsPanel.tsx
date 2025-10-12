'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  updateUserLanguage,
  updateUserTheme,
  updateUserNotifications,
} from '../../lib/firebase/auth';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { applyLanguageToDocument } from '../../lib/i18n/applyLanguage';
import Toast from '../ui/Toast';

export default function SettingsPanel() {
  const { t, i18n } = useTranslation();
  const { status, firebaseUser, data: profile } = useCurrentUserProfile();
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notificationsInApp, setNotificationsInApp] = useState<boolean>(true);
  const [notificationsEmail, setNotificationsEmail] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (status !== 'ready') return;
    if (!firebaseUser || !profile) return;
    setLanguage((profile.settings?.language as 'en' | 'he') || 'en');
    setTheme((profile.settings?.theme as 'light' | 'dark' | 'system') || 'system');
    setNotificationsInApp(profile.settings?.notifications?.inApp ?? true);
    setNotificationsEmail(profile.settings?.notifications?.email ?? true);
  }, [status, firebaseUser, profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await Promise.all([
        updateUserLanguage(language),
        updateUserTheme(theme),
        updateUserNotifications({ inApp: notificationsInApp, email: notificationsEmail }),
      ]);
      applyLanguageToDocument(language);
      i18n.changeLanguage(language);
      // Apply theme immediately according to Tailwind dark mode class strategy
      const root = document.documentElement;
      if (theme === 'dark') {
        root.classList.add('dark');
      } else if (theme === 'light') {
        root.classList.remove('dark');
      } else {
        const prefersDark =
          window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) root.classList.add('dark');
        else root.classList.remove('dark');
      }
      setToast(t('settings.saved', { defaultValue: 'Settings saved' }));
    } catch {
      setToast(t('settings.error', { defaultValue: 'Failed to save settings' }));
    } finally {
      setLoading(false);
    }
  }

  if (status !== 'ready') {
    return <div className="text-sm text-gray-600">Loading…</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 glass-card card-levitate p-4">
      <Toast message={toast} onClear={() => setToast(null)} />
      <div>
        <label className="block text-sm font-medium">{t('auth.language')}</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
          className="mt-1 input-levitate"
        >
          <option value="en">English</option>
          <option value="he">עברית</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">{t('settings.theme')}</label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="mt-1 input-levitate"
        >
          <option value="system">{t('settings.theme.system')}</option>
          <option value="light">{t('settings.theme.light')}</option>
          <option value="dark">{t('settings.theme.dark')}</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium">{t('settings.notifications')}</label>
        <div className="mt-2 flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notificationsInApp}
              onChange={(e) => setNotificationsInApp(e.target.checked)}
            />
            <span>{t('settings.notifications.inApp')}</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={notificationsEmail}
              onChange={(e) => setNotificationsEmail(e.target.checked)}
            />
            <span>{t('settings.notifications.email')}</span>
          </label>
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
      >
        {t('settings.save', { defaultValue: 'Save' })}
      </button>
    </form>
  );
}
