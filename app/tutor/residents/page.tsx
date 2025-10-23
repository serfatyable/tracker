'use client';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import { SpinnerSkeleton } from '../../../components/dashboard/Skeleton';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import ResidentsTab from '../../../components/tutor/tabs/ResidentsTab';

export default function TutorResidentsPage() {
  const { t } = useTranslation();
  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <LargeTitleHeader
          title={t('tutor.tabs.residents', { defaultValue: 'Residents' }) as string}
        />
        <div className="app-container p-4">
          <Suspense fallback={<SpinnerSkeleton />}>
            <ResidentsTab
              meUid={'' as any}
              residents={[] as any}
              assignments={[] as any}
              rotations={[] as any}
              petitions={[] as any}
              ownedRotationIds={new Set()}
              onApprove={async () => {}}
              onDeny={async () => {}}
              onSelfAssign={async () => {}}
              onUnassignSelf={async () => {}}
            />
          </Suspense>
        </div>
      </AppShell>
    </AuthGate>
  );
}
