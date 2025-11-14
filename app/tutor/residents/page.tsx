'use client';
import { useTranslation } from 'react-i18next';

import AuthGate from '@/components/auth/AuthGate';
import AppShell from '@/components/layout/AppShell';
import LargeTitleHeader from '@/components/layout/LargeTitleHeader';
import ResidentDirectoryPage from '@/components/residents/ResidentDirectoryPage';

function TutorResidentsPageInner() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <LargeTitleHeader
        title={t('tutor.tabs.residents', { defaultValue: 'Residents' }) as string}
      />
      <div className="app-container p-4">
        <div className="mx-auto w-full max-w-5xl">
          <ResidentDirectoryPage />
        </div>
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
