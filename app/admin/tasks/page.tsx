'use client';
import { useTranslation } from 'react-i18next';

import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';

export default function AdminTasksPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.tasks', { defaultValue: 'Tasks' }) as string} />
      <div className="app-container p-4">
        <div className="text-sm opacity-70">
          {t('ui.comingSoon', { defaultValue: 'Coming soon' })}
        </div>
      </div>
    </AppShell>
  );
}
