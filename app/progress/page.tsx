'use client';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import EnhancedProgress from '../../components/resident/EnhancedProgress';
import { ResidentActiveRotationProvider } from '../../components/resident/ResidentActiveRotationProvider';

function ProgressPageContent() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <LargeTitleHeader title={t('resident.progress', { defaultValue: 'Progress' }) as string} />
      <div className="app-container p-4">
        <EnhancedProgress />
      </div>
    </AppShell>
  );
}

export default function ProgressPage() {
  return (
    <ResidentActiveRotationProvider>
      <ProgressPageContent />
    </ResidentActiveRotationProvider>
  );
}
