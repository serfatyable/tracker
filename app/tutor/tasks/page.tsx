'use client';
import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import { SpinnerSkeleton } from '../../../components/dashboard/Skeleton';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import TasksTab from '../../../components/tutor/tabs/TasksTab';
import { updateTasksStatus } from '../../../lib/firebase/admin';
import { useTutorDashboardData } from '../../../lib/hooks/useTutorDashboardData';

export default function TutorTasksPage() {
  const { t } = useTranslation();
  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <LargeTitleHeader title={t('ui.tasks', { defaultValue: 'Tasks' }) as string} />
        <div className="app-container p-4">
          <Suspense fallback={<SpinnerSkeleton />}>
            <TasksTabWrapper />
          </Suspense>
        </div>
      </AppShell>
    </AuthGate>
  );
}

function TasksTabWrapper() {
  const { residents, tasks } = useTutorDashboardData();

  const handleBulkApprove = async (taskIds: string[]) => {
    await updateTasksStatus({ taskIds, status: 'approved' });
  };

  const handleBulkReject = async (taskIds: string[]) => {
    await updateTasksStatus({ taskIds, status: 'rejected' });
  };

  return (
    <TasksTab
      residents={residents}
      tasks={tasks}
      onBulkApprove={handleBulkApprove}
      onBulkReject={handleBulkReject}
    />
  );
}
