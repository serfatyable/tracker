'use client';
import { UserGroupIcon, AcademicCapIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const rotationParam = searchParams.get('rotation');
  const [activeTab, setActiveTab] = useState<Tab>(rotationParam ? 'assignments' : 'users');

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('ui.userManagement', { defaultValue: 'User Management' }) as string}
      />
      <div className="app-container p-4">
        {/* Tab Navigation */}
        <div className="flex items-center gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 rounded-none min-h-[44px] ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
            }`}
          >
            <UserGroupIcon className="w-4 h-4" />
            {t('ui.users', { defaultValue: 'Users' })}
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all border-b-2 rounded-none min-h-[44px] ${
              activeTab === 'assignments'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/30'
            }`}
          >
            <AcademicCapIcon className="w-4 h-4" />
            {t('ui.assignments', { defaultValue: 'Assignments' })}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'users' ? <UserManagementTable /> : <AssignmentsView />}
      </div>
    </AppShell>
  );
}
