'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import SettingsPanel from '../../components/settings/SettingsPanel';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';

export default function SettingsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { status, firebaseUser, data: profile } = useCurrentUserProfile();

  useEffect(() => {
    if (status !== 'ready') return; // wait until auth state is known
    if (!firebaseUser) {
      router.replace('/auth');
      return;
    }
    if (!profile || profile.status === 'pending') {
      router.replace('/awaiting-approval');
      return;
    }
  }, [status, firebaseUser, profile, router]);

  return (
    <div className="mx-auto max-w-md p-6">
      {status !== 'ready' ? <div className="text-sm text-gray-600">Loading…</div> : null}
      <h1 className="mb-4 text-xl font-semibold">
        {t('settings.title', { defaultValue: 'Settings' })}
      </h1>
      <SettingsPanel />
    </div>
  );
}
