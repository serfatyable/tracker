'use client';
import { useTranslation } from 'react-i18next';

import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import AdminReflectionsTabs from '../../../components/admin/reflections/AdminReflectionsTabs';

export default function AdminReflectionsPage() {
  const { t } = useTranslation();
  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.reflections', { defaultValue: 'Reflections' }) as string} />
      <div className="app-container p-4 space-y-3">
        <AdminReflectionsTabs />
      </div>
    </AppShell>
  );
}
