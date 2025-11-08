'use client';

import { doc, getFirestore, serverTimestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { updateUserLanguage, updateUserTheme, updateUserNotifications } from '@/lib/firebase/auth';
import { getFirebaseApp } from '@/lib/firebase/client';
import { applyLanguageToDocument } from '@/lib/i18n/applyLanguage';
import type { UserProfile } from '@/types/auth';

interface PreferencesSectionProps {
  profile: UserProfile;
  firebaseUserId: string;
  onToast: (message: string) => void;
}

export default function PreferencesSection({
  profile,
  firebaseUserId,
  onToast,
}: PreferencesSectionProps) {
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState<'en' | 'he'>('en');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [notificationsInApp, setNotificationsInApp] = useState<boolean>(true);
  const [notificationsEmail, setNotificationsEmail] = useState<boolean>(true);
  const [defaultDensity, setDefaultDensity] = useState<'normal' | 'compact'>(() => {
    if (typeof window === 'undefined') return 'normal';
    return (localStorage.getItem('ui_density') as 'normal' | 'compact') || 'normal';
  });
  const [mmReminder, setMmReminder] = useState<boolean>(false);

  useEffect(() => {
    if (profile) {
      setLanguage((profile.settings?.language as 'en' | 'he') || 'en');
      setTheme((profile.settings?.theme as 'light' | 'dark' | 'system') || 'system');
      setNotificationsInApp(profile.settings?.notifications?.inApp ?? true);
      setNotificationsEmail(profile.settings?.notifications?.email ?? true);
      setMmReminder(profile.settings?.morningMeetings?.reminderOptIn ?? false);
    }
  }, [profile]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      await Promise.all([
        updateUserLanguage(language),
        updateUserTheme(theme),
        updateUserNotifications({ inApp: notificationsInApp, email: notificationsEmail }),
      ]);
      // Save morningMeetings reminder
      try {
        if (firebaseUserId) {
          const db = getFirestore(getFirebaseApp());
          await updateDoc(doc(db, 'users', firebaseUserId), {
            'settings.morningMeetings.reminderOptIn': mmReminder,
            updatedAt: serverTimestamp(),
          } as any);
        }
      } catch {
        // Error updating user preferences
      }
      applyLanguageToDocument(language);
      i18n.changeLanguage(language);
      try {
        document.cookie = `i18n_lang=${language}; path=/; SameSite=Lax`;
      } catch {
        // ignore
      }
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
      onToast(t('settings.saved'));
    } catch {
      onToast(t('settings.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50">
        {t('settings.preferences.title')}
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('auth.language')}
        </label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as 'en' | 'he')}
          className="mt-1 input-levitate rtl:text-right"
        >
          <option value="en">English</option>
          <option value="he">עברית</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('settings.tableDensity', { defaultValue: 'Table density' })}
        </label>
        <select
          value={defaultDensity}
          onChange={(e) => {
            const v = e.target.value as 'normal' | 'compact';
            setDefaultDensity(v);
            try {
              localStorage.setItem('ui_density', v);
            } catch {
              // localStorage may not be available
            }
          }}
          className="mt-1 input-levitate rtl:text-right"
        >
          <option value="normal">{t('ui.normal')}</option>
          <option value="compact">{t('ui.compact')}</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('settings.theme')}
        </label>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'light' | 'dark' | 'system')}
          className="mt-1 input-levitate rtl:text-right"
        >
          <option value="system">{t('settings.theme.system')}</option>
          <option value="light">{t('settings.theme.light')}</option>
          <option value="dark">{t('settings.theme.dark')}</option>
        </select>
      </div>

      <div>
        <label className="mt-2 inline-flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
          <input
            type="checkbox"
            checked={mmReminder}
            onChange={(e) => setMmReminder(e.target.checked)}
          />
          <span>{t('morningMeetings.lecturerReminder')}</span>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('settings.notifications')}
        </label>
        <div className="mt-2 flex items-center gap-6">
          <label className="inline-flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
            <input
              type="checkbox"
              checked={notificationsInApp}
              onChange={(e) => setNotificationsInApp(e.target.checked)}
            />
            <span>{t('settings.notifications.inApp')}</span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-gray-900 dark:text-gray-50">
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
