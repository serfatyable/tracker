'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import { CardSkeleton } from '../../../components/dashboard/Skeleton';
import { useTutorDashboardData } from '../../../lib/hooks/useTutorDashboardData';
import RotationsTab from '../../../components/tutor/tabs/RotationsTab';

export default function TutorRotationsPage() {
  const { t } = useTranslation();
  const { me, rotations, assignments, residents, petitions } = useTutorDashboardData();
  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <LargeTitleHeader title={t('ui.rotations', { defaultValue: 'Rotations' }) as string} />
        <div className="app-container p-4">
          <Suspense fallback={<CardSkeleton />}> 
            {me ? (
              <RotationsTab
                meUid={me.uid}
                rotations={rotations}
                assignments={assignments}
                residents={residents}
                petitions={petitions}
              />
            ) : (
              <CardSkeleton />
            )}
          </Suspense>
          <div className="mt-4 flex justify-end">
            <Link href="/tutor/residents" className="pill text-xs">
              {t('tutor.tabs.residents')}
            </Link>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}


