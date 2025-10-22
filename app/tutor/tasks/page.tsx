'use client';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import { SpinnerSkeleton } from '../../../components/dashboard/Skeleton';
import TasksTab from '../../../components/tutor/tabs/TasksTab';

export default function TutorTasksPage() {
  const { t } = useTranslation();
  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <LargeTitleHeader title={t('ui.tasks', { defaultValue: 'Tasks' }) as string} />
        <div className="app-container p-4">
          <Suspense fallback={<SpinnerSkeleton />}>
            <TasksTab residents={[] as any} tasks={[] as any} onBulkApprove={async () => {}} onBulkReject={async () => {}} />
          </Suspense>
        </div>
      </AppShell>
    </AuthGate>
  );
}
