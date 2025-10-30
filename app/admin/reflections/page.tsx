'use client';
import { useTranslation } from 'react-i18next';

import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import Card from '../../../components/ui/Card';

export default function AdminReflectionsPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.reflections', { defaultValue: 'Reflections' }) as string} />
      <div className="app-container p-4 space-y-3">
        <Card>
          <div className="font-semibold mb-2">
            {t('reflections.latest', { defaultValue: 'Latest' })}
          </div>
          <div className="text-sm opacity-70">
            {t('ui.comingSoon', { defaultValue: 'Coming soon' })}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
