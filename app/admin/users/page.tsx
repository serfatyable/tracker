'use client';
import { useTranslation } from 'react-i18next';

import UserManagementTable from '../../../components/admin/users/UserManagementTable';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';

export default function AdminUsersPage() {
  const { t } = useTranslation();

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('ui.userManagement', { defaultValue: 'User Management' }) as string}
      />
      <div className="app-container p-4">
        <UserManagementTable />
      </div>
    </AppShell>
  );
}
