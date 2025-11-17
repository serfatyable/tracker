'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { status, firebaseUser, data: profile, error } = useCurrentUserProfile();

  useEffect(() => {
    if (status !== 'ready') return;

    if (!firebaseUser) {
      router.replace('/auth');
      return;
    }

    if (profile && profile.status !== 'pending') {
      if (profile.role === 'resident') {
        router.replace('/resident');
      } else if (profile.role === 'tutor') {
        router.replace('/tutor');
      } else {
        router.replace('/admin');
      }
    }
  }, [status, firebaseUser, profile, router]);

  let message = t('auth.awaitingApproval');
  if (status === 'loading') {
    message = t('auth.awaitingApproval');
  } else if (status === 'error') {
    message = error ?? t('errors.firebaseGeneric');
  }

  return (
    <div className="mx-auto max-w-md p-6 text-center">
      <p className="text-lg text-gray-900 dark:text-gray-50" suppressHydrationWarning>
        {message}
      </p>
    </div>
  );
}
