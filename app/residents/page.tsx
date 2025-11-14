'use client';

import { useTranslation } from 'react-i18next';

import AuthGate from '@/components/auth/AuthGate';
import AppShell from '@/components/layout/AppShell';
import LargeTitleHeader from '@/components/layout/LargeTitleHeader';
import ResidentDirectoryPage from '@/components/residents/ResidentDirectoryPage';

export default function ResidentsDirectoryPage() {
  const { t } = useTranslation();
  return (
    <AuthGate allowedRoles={['admin', 'tutor']}>
      <AppShell>
        <LargeTitleHeader
          title={t('tutor.tabs.residents', { defaultValue: 'Residents' }) as string}
        />
        <div className="app-container p-4">
          <ResidentDirectoryPage />
        </div>
      </AppShell>
    </AuthGate>
  );
}
