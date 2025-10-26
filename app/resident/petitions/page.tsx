'use client';

import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import PetitionsListView from '../../../components/resident/PetitionsListView';
import { getFirebaseApp } from '../../../lib/firebase/client';

export default function ResidentPetitionsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [residentId, setResidentId] = useState<string>('');

  useEffect(() => {
    const auth = getAuth(getFirebaseApp());
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setResidentId(user.uid);
      } else {
        router.push('/auth');
      }
    });

    return () => unsubscribe();
  }, [router]);

  return (
    <AuthGate requiredRole="resident">
      <AppShell>
        <LargeTitleHeader
          title={t('petitions.myPetitions', { defaultValue: 'My Petitions' })}
          subtitle={t('petitions.petitionsSubtitle', {
            defaultValue: 'View and track your rotation requests',
          })}
        />

        <div className="app-container p-4 space-y-4 pb-24 pad-safe-b">
          {residentId && <PetitionsListView residentId={residentId} />}
        </div>
      </AppShell>
    </AuthGate>
  );
}
