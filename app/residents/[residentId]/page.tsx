'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '@/components/auth/AuthGate';
import AppShell from '@/components/layout/AppShell';
import LargeTitleHeader from '@/components/layout/LargeTitleHeader';
import ResidentDetailPage from '@/components/residents/ResidentDetailPage';
import Button from '@/components/ui/Button';

export default function ResidentDetailRoutePage() {
  const params = useParams<{ residentId?: string | string[] }>();
  const router = useRouter();
  const { t } = useTranslation();

  const residentId = useMemo(() => {
    const value = params?.residentId;
    if (!value) return null;
    if (Array.isArray(value)) return value[0] ?? null;
    return value;
  }, [params?.residentId]);

  const goBack = () => router.push('/residents');

  return (
    <AuthGate allowedRoles={['admin', 'tutor']}>
      <AppShell>
        <LargeTitleHeader
          title={t('tutor.residentProfile', { defaultValue: 'Resident profile' }) as string}
          rightSlot={
            <Button variant="secondary" onClick={goBack}>
              {t('ui.backToResidents', { defaultValue: 'Back to residents' })}
            </Button>
          }
        />
        <div className="app-container p-4">
          <ResidentDetailPage residentId={residentId} onBack={goBack} />
        </div>
      </AppShell>
    </AuthGate>
  );
}
