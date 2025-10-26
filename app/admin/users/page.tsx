'use client';
import { UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import UserManagementTable from '../../../components/admin/users/UserManagementTable';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import Button from '../../../components/ui/Button';

// Dynamically import AssignmentsView to avoid SSR issues
const AssignmentsView = dynamic(() => import('../../../components/admin/users/AssignmentsView'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center p-8">Loading assignments...</div>,
});

type Tab = 'users' | 'assignments';

export default function AdminUsersPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('users');

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('ui.userManagement', { defaultValue: 'User Management' }) as string}
      />
      <div className="app-container p-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <Button
            variant={activeTab === 'users' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[active=true]:border-blue-500 data-[active=true]:bg-transparent"
            data-active={activeTab === 'users'}
          >
            <UserGroupIcon className="w-4 h-4" />
            {t('ui.users', { defaultValue: 'Users' })}
          </Button>
          <Button
            variant={activeTab === 'assignments' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('assignments')}
            className="flex items-center gap-2 rounded-none border-b-2 border-transparent data-[active=true]:border-blue-500 data-[active=true]:bg-transparent"
            data-active={activeTab === 'assignments'}
          >
            <AcademicCapIcon className="w-4 h-4" />
            {t('ui.assignments', { defaultValue: 'Assignments' })}
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' ? <UserManagementTable /> : <AssignmentsView />}
      </div>
    </AppShell>
  );
}
