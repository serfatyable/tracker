'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import { CardSkeleton } from '../../../components/dashboard/Skeleton';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';

const RotationsPanel = dynamic(() => import('../../../components/admin/rotations/RotationsPanel'), {
  loading: () => <CardSkeleton />,
  ssr: false,
});

export default function AdminRotationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <AuthGate requiredRole="admin">
      <AppShell>
        <LargeTitleHeader title={t('ui.rotations', { defaultValue: 'Rotations' }) as string} />
        <div className="app-container p-4">
          <Suspense fallback={<CardSkeleton />}>
            <RotationsPanel
              onOpenEditor={(rotationId) => router.push(`/admin/rotations/${rotationId}`)}
            />
          </Suspense>
        </div>
      </AppShell>
    </AuthGate>
  );
}
