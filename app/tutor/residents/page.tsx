'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import { SpinnerSkeleton } from '../../../components/dashboard/Skeleton';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import ResidentsTab from '../../../components/tutor/tabs/ResidentsTab';
import {
  approveRotationPetition,
  denyRotationPetition,
  assignTutorToResident,
  unassignTutorFromResident,
} from '../../../lib/firebase/admin';
import { useTutorDashboardData } from '../../../lib/hooks/useTutorDashboardData';

function TutorResidentsPageInner() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const rotationFilter = searchParams.get('rotation');
  const { me, residents, assignments, rotations, petitions, ownedRotationIds } =
    useTutorDashboardData();

  const handleApprove = useCallback(async (petitionId: string) => {
    await approveRotationPetition(petitionId);
  }, []);

  const handleDeny = useCallback(async (petitionId: string) => {
    await denyRotationPetition(petitionId);
  }, []);

  const handleSelfAssign = useCallback(
    async (residentId: string) => {
      if (!me?.uid) return;
      await assignTutorToResident(residentId, me.uid);
    },
    [me?.uid],
  );

  const handleUnassignSelf = useCallback(
    async (residentId: string) => {
      if (!me?.uid) return;
      await unassignTutorFromResident(residentId, me.uid);
    },
    [me?.uid],
  );

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('tutor.tabs.residents', { defaultValue: 'Residents' }) as string}
      />
      <div className="app-container p-4">
        <Suspense fallback={<SpinnerSkeleton />}>
          {me ? (
            <ResidentsTab
              meUid={me.uid}
              residents={residents}
              assignments={assignments}
              rotations={rotations}
              petitions={petitions}
              ownedRotationIds={ownedRotationIds}
              filterRotationId={rotationFilter || undefined}
              onApprove={handleApprove}
              onDeny={handleDeny}
              onSelfAssign={handleSelfAssign}
              onUnassignSelf={handleUnassignSelf}
            />
          ) : (
            <SpinnerSkeleton />
          )}
        </Suspense>
      </div>
    </AppShell>
  );
}

export default function TutorResidentsPage() {
  return (
    <AuthGate requiredRole="tutor">
      <TutorResidentsPageInner />
    </AuthGate>
  );
}
