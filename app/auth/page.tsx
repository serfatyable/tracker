'use client';
import { Tab } from '@headlessui/react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18nInstance from '../../lib/i18n/init';

import PasswordInput from '../../components/auth/PasswordInput';
import RolePills from '../../components/auth/RolePills';
import TextInput from '../../components/auth/TextInput';
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
      (typeof window !== 'undefined' && (localStorage.getItem('i18n_lang') as 'en' | 'he')) || 'en',
  );
  useEffect(() => {
    localStorage.setItem('i18n_lang', language);
    i18nInstance.changeLanguage(language);
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language, i18n]);

  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const [fullName, setFullName] = useState('');
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
      const profLang = (profile?.settings?.language as 'en' | 'he') || 'en';
      applyLanguageToDocument(profLang);
      i18nInstance.changeLanguage(profLang);
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
        email: suEmail,
        password: suPassword,
        role,
        language,
        residencyStartDate: role === 'resident' ? residencyStartDate : undefined,
      });
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
      <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6">
        <div className="glass-card w-full p-4 text-sm text-red-700">
          Firebase is not configured. Check your .env.local.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center p-6">
      {/* Force brand header to LTR regardless of app language */}
      <div dir="ltr" className="mb-6 flex w-full max-w-2xl items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.jpg"
            alt="Tracker"
            width={56}
            height={56}
            className="rounded-full object-cover ring-1 ring-gray-300"
          />
          <h1 className="text-3xl font-semibold">Tracker</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={classNames(
              'rounded-full px-3 py-1 text-sm border',
              language === 'en' ? 'bg-white text-blue-600 ring-2 ring-blue-500' : 'bg-transparent',
            )}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('he')}
            className={classNames(
              'rounded-full px-3 py-1 text-sm border',
              language === 'he' ? 'bg-white text-blue-600 ring-2 ring-blue-500' : 'bg-transparent',
            )}
          >
            HE
          </button>
        </div>
      </div>
      <div className="glass-card w-full">
        <Tab.Group selectedIndex={tabIndex} onChange={setTabIndex}>
          <Tab.List className="mb-6 flex gap-2">
            <Tab
              className={({ selected }) =>
                classNames('tab-levitate flex-1 text-center', selected && 'ring-1 ring-blue-500')
              }
            >
              {t('auth.signIn')}
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames('tab-levitate flex-1 text-center', selected && 'ring-1 ring-blue-500')
              }
            >
              {t('auth.signUp')}
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
                />
                <PasswordInput
                  id="si-password"
                  value={siPassword}
                  onChange={setSiPassword}
                  label={t('auth.password')}
                  required
                  disabled={loading}
                />
                <button type="submit" disabled={loading} className="btn-levitate w-full">
                  {t('auth.signIn')}
                </button>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={loading}
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline disabled:text-gray-400"
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
                />
                <PasswordInput
                  id="su-password"
                  value={suPassword}
                  onChange={setSuPassword}
                  label={t('auth.password')}
                  required
                  disabled={loading}
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
                  />
                ) : null}
                <button type="submit" disabled={loading} className="btn-levitate w-full">
                  {t('auth.submit')}
                </button>
              </form>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
}
