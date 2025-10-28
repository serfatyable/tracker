'use client';
import { Tab } from '@headlessui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
// removed direct i18n instance import; use hook instance instead

// Note: metadata export must be in a Server Component, but this is a Client Component
// The parent layout provides the default metadata

import PasswordInput from '../../components/auth/PasswordInput';
import RolePills from '../../components/auth/RolePills';
import TextInput from '../../components/auth/TextInput';
import Card from '../../components/ui/Card';
import {
  signIn,
  signUp,
  getCurrentUserWithProfile,
  requestPasswordReset,
} from '../../lib/firebase/auth';
import { getFirebaseStatus } from '../../lib/firebase/client';
import { mapFirebaseAuthErrorToI18nKey } from '../../lib/firebase/errors';
import { applyLanguageToDocument } from '../../lib/i18n/applyLanguage';
import type { Role } from '../../types/auth';

function classNames(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const firebaseOk = getFirebaseStatus().ok;
  const [tabIndex, setTabIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const [language, setLanguage] = useState<'en' | 'he'>(
    () =>
      (typeof document !== 'undefined' && (document.documentElement.lang === 'he' ? 'he' : 'en')) ||
      'en',
  );
  // On mount, sync with <html lang> which is set server-side to avoid SSR/CSR mismatch
  useEffect(() => {
    try {
      const docLang = document.documentElement.lang === 'he' ? 'he' : 'en';
      if (docLang !== language) setLanguage(docLang);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('i18n_lang', language);
    } catch {
      // localStorage may not be available
    }
    try {
      document.cookie = `i18n_lang=${language}; path=/; SameSite=Lax`;
    } catch {
      // cookies may not be available
    }
    try {
      if (i18n.language !== language) {
        i18n.changeLanguage(language);
      }
    } catch {
      // i18n may not be initialized
    }
    try {
      if (document.documentElement.lang !== language) {
        document.documentElement.lang = language;
      }
      const desiredDir = language === 'he' ? 'rtl' : 'ltr';
      if (document.documentElement.dir !== desiredDir) {
        document.documentElement.dir = desiredDir;
      }
    } catch {
      // document may not be available in SSR
    }
  }, [language, i18n]);

  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [fullName, setFullName] = useState('');
  const [fullNameHe, setFullNameHe] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [role, setRole] = useState<Role>('resident');
  const [residencyStartDate, setResidencyStartDate] = useState('');

  useEffect(() => {
    if (role !== 'resident') setResidencyStartDate('');
  }, [role]);

  function validateEmail(value: string) {
    return /.+@.+\..+/.test(value);
  }
  function isPastDateYYYYMMDD(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(value + 'T00:00:00');
    const today = new Date();
    return (
      d.getTime() <= new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    );
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    const newErrors: Record<string, string | null> = {};
    if (!siEmail) newErrors.siEmail = t('errors.required');
    else if (!validateEmail(siEmail)) newErrors.siEmail = t('errors.email');
    if (!siPassword) newErrors.siPassword = t('errors.required');
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    try {
      setLoading(true);
      await signIn(siEmail, siPassword);
      const { profile } = await getCurrentUserWithProfile();
      // Prefer the user's current selection on the Auth page; fall back to profile
      const nextLang: 'en' | 'he' =
        language || (profile?.settings?.language as 'en' | 'he') || 'en';
      applyLanguageToDocument(nextLang);
      if (i18n.language !== nextLang) i18n.changeLanguage(nextLang);
      try {
        document.cookie = `i18n_lang=${nextLang}; path=/; SameSite=Lax`;
      } catch {
        /* noop */
      }
      router.push('/awaiting-approval');
    } catch (err: any) {
      const key = mapFirebaseAuthErrorToI18nKey('signin', err?.code);
      setFormMessage(t(key));
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    const email = siEmail;
    if (!email || !validateEmail(email)) {
      setErrors((prev) => ({ ...prev, siEmail: t('errors.email') }));
      return;
    }
    try {
      setLoading(true);
      await requestPasswordReset(email);
      setResetSent(true);
    } catch {
      setFormMessage(t('errors.firebaseGeneric'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setFormMessage(null);
    const newErrors: Record<string, string | null> = {};
    if (!fullName) newErrors.fullName = t('errors.required');
    if (!suEmail) newErrors.suEmail = t('errors.required');
    else if (!validateEmail(suEmail)) newErrors.suEmail = t('errors.email');
    if (!suPassword) newErrors.suPassword = t('errors.required');
    else if (suPassword.length < 8) newErrors.suPassword = t('errors.passwordLength');
    if (role === 'resident') {
      if (!residencyStartDate) newErrors.residencyStartDate = t('errors.required');
      else if (!isPastDateYYYYMMDD(residencyStartDate))
        newErrors.residencyStartDate = t('errors.dateInFuture');
    }
    setErrors(newErrors);
    if (Object.values(newErrors).some(Boolean)) return;
    try {
      setLoading(true);
      await signUp({
        fullName,
        fullNameHe,
        email: suEmail,
        password: suPassword,
        role,
        language,
        residencyStartDate: role === 'resident' ? residencyStartDate : undefined,
      });
      // Apply language immediately and persist cookie before navigating
      try {
        applyLanguageToDocument(language);
        if (i18n.language !== language) i18n.changeLanguage(language);
      } catch {
        /* noop */
      }
      try {
        document.cookie = `i18n_lang=${language}; path=/; SameSite=Lax`;
      } catch {
        /* noop */
      }
      router.push('/awaiting-approval');
    } catch (err: any) {
      const key = mapFirebaseAuthErrorToI18nKey('signup', err?.code);
      setFormMessage(t(key));
    } finally {
      setLoading(false);
    }
  }

  if (!firebaseOk) {
    return (
      <div className="mx-auto flex min-h-dvh pad-safe-t pad-safe-b w-full max-w-2xl flex-col items-center justify-center px-4 py-6 sm:px-6">
        <Card className="w-full p-4 text-sm text-red-700">
          <div>{t('errors.firebaseNotConfigured')}</div>
          <div className="text-xs mt-1 opacity-75">{t('errors.firebaseNotConfiguredHint')}</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh pad-safe-t pad-safe-b w-full max-w-2xl flex-col items-center justify-center px-4 py-6 sm:px-6">
      {/* Force brand header to LTR regardless of app language */}
      <div dir="ltr" className="mb-6 flex w-full items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1
            className="text-4xl sm:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100"
            aria-label="TRACKER"
          >
            TRACKER
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={classNames(
              'rounded-full px-3 py-1 text-sm border',
              language === 'en'
                ? 'pill ring-2 ring-primary border-primary-token'
                : 'pill opacity-90 border-primary-token',
            )}
            suppressHydrationWarning
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('he')}
            className={classNames(
              'rounded-full px-3 py-1 text-sm border',
              language === 'he'
                ? 'pill ring-2 ring-primary border-primary-token'
                : 'pill opacity-90 border-primary-token',
            )}
            suppressHydrationWarning
          >
            HE
          </button>
        </div>
      </div>
      <Card className="w-full">
        <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
          <Tab.List className="mb-6 flex gap-2">
            <Tab
              className={({ selected }) =>
                classNames('tab-levitate flex-1 text-center', selected && 'ring-1 ring-blue-500')
              }
            >
              <span suppressHydrationWarning>{t('auth.signIn')}</span>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames('tab-levitate flex-1 text-center', selected && 'ring-1 ring-blue-500')
              }
            >
              <span suppressHydrationWarning>{t('auth.signUp')}</span>
            </Tab>
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel>
              <form
                onSubmit={handleSignIn}
                className="space-y-4"
                aria-describedby={formMessage ? 'si-form-error' : undefined}
              >
                {formMessage ? (
                  <div
                    id="si-form-error"
                    className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700"
                  >
                    {formMessage}
                  </div>
                ) : null}
                <TextInput
                  id="si-email"
                  type="email"
                  value={siEmail}
                  onChange={setSiEmail}
                  label={t('auth.email')}
                  error={errors.siEmail || null}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <PasswordInput
                  id="si-password"
                  value={siPassword}
                  onChange={setSiPassword}
                  label={t('auth.password')}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-levitate w-full"
                  suppressHydrationWarning
                >
                  {t('auth.signIn')}
                </button>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline disabled:text-gray-400 dark:text-blue-400 dark:hover:text-blue-300"
                    suppressHydrationWarning
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                {resetSent ? (
                  <div role="status" className="mt-1 text-sm text-green-700">
                    {t('auth.resetEmailSent')}
                  </div>
                ) : null}
              </form>
            </Tab.Panel>
            <Tab.Panel>
              <form
                onSubmit={handleSignUp}
                className="space-y-4"
                aria-describedby={formMessage ? 'su-form-error' : undefined}
              >
                {formMessage ? (
                  <div
                    id="su-form-error"
                    className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700"
                  >
                    {formMessage}
                  </div>
                ) : null}
                <TextInput
                  id="su-fullname"
                  value={fullName}
                  onChange={setFullName}
                  label={t('auth.fullName')}
                  error={errors.fullName || null}
                  required
                  disabled={loading}
                  autoComplete="name"
                />
                <TextInput
                  id="su-fullname-he"
                  value={fullNameHe}
                  onChange={setFullNameHe}
                  label={t('auth.fullName') + ' (HE)'}
                  disabled={loading}
                  autoComplete="off"
                />
                <TextInput
                  id="su-email"
                  type="email"
                  value={suEmail}
                  onChange={setSuEmail}
                  label={t('auth.email')}
                  error={errors.suEmail || null}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
                <PasswordInput
                  id="su-password"
                  value={suPassword}
                  onChange={setSuPassword}
                  label={t('auth.password')}
                  required
                  disabled={loading}
                  autoComplete="new-password"
                />
                <RolePills value={role} onChange={setRole} disabled={loading} />
                {role === 'resident' ? (
                  <TextInput
                    id="su-residencyStartDate"
                    type="date"
                    value={residencyStartDate}
                    onChange={setResidencyStartDate}
                    label={t('auth.residencyStartDate')}
                    error={errors.residencyStartDate || null}
                    required
                    disabled={loading}
                    autoComplete="off"
                  />
                ) : null}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-levitate w-full"
                  suppressHydrationWarning
                >
                  {t('auth.submit')}
                </button>
              </form>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </Card>
    </div>
  );
}
