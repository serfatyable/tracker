'use client';
import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import EnhancedProgress from '../../components/resident/EnhancedProgress';
import { useTranslation } from 'react-i18next';

export default function ProgressPage() {
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
