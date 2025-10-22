'use client';
import Link from 'next/link';
import { lazy, Suspense, useMemo as _useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// Link import moved above per import order

import MorningMeetingsView from '../../components/admin/morning-meetings/MorningMeetingsView';
import OnCallScheduleView from '../../components/admin/on-call/OnCallScheduleView';
import AuthGate from '../../components/auth/AuthGate';
import { SpinnerSkeleton, CardSkeleton } from '../../components/dashboard/Skeleton';
import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import Card from '../../components/ui/Card';
// Tabs removed per mobile-first stacked sections
import Toast from '../../components/ui/Toast';
import {
  approveRotationPetition,
  denyRotationPetition,
  assignTutorToResident,
  unassignTutorFromResident,
  updateTasksStatus,
} from '../../lib/firebase/admin';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForTutor } from '../../lib/hooks/useReflections';
import { useTutorDashboardData } from '../../lib/hooks/useTutorDashboardData';

// Lazy load heavy components
// Unused lazy imports removed
const SettingsPanel = lazy(() => import('../../components/settings/SettingsPanel'));
const AssignedResidents = lazy(() => import('../../components/tutor/AssignedResidents'));
const PendingApprovals = lazy(() => import('../../components/tutor/PendingApprovals'));
const ResidentsTab = lazy(() => import('../../components/tutor/tabs/ResidentsTab'));
const RotationsTab = lazy(() => import('../../components/tutor/tabs/RotationsTab'));
const TasksTab = lazy(() => import('../../components/tutor/tabs/TasksTab'));
const TutorTodos = lazy(() => import('../../components/tutor/TutorTodos'));

export default function TutorDashboard() {
  const { t } = useTranslation();
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  const handleToast = (message: string, variant: 'success' | 'error') => {
    setToast({ message, variant });
  };

  return (
    <AuthGate requiredRole="tutor">
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      <AppShell>
        <LargeTitleHeader title={t('ui.home', { defaultValue: 'Home' }) as string} />
        <div className="app-container p-6">
          <div className="w-full space-y-6">
            {/* Quick links */}
            <div className="flex items-center justify-end gap-2">
              <Link href="/tutor/residents" className="pill text-xs">
                {t('tutor.tabs.residents')}
              </Link>
              <Link href="/tutor/tasks" className="pill text-xs">
                {t('ui.tasks')}
              </Link>
            </div>

            {/* 1) Overview (personal KPIs/sections) */}
            <Suspense
              fallback={
                <div className="space-y-3">
                  <CardSkeleton />
                  <CardSkeleton />
                </div>
              }
            >
              <div className="space-y-3">
                <TutorDashboardSections />
              </div>
            </Suspense>

            {/* 2) On-Call today/tonight */}
            <OnCallScheduleView showUploadButton={false} />

            {/* 3) Rotations progress */}
            <Suspense fallback={<SpinnerSkeleton />}> 
              <TutorRotationsTab />
            </Suspense>

            {/* 4) Reflections queue */}
            <TutorReflectionsInline />

            {/* 5) Morning Meetings */}
            <MorningMeetingsView showUploadButton={false} />

            {/* 6) Settings link only */}
            <div className="flex justify-end">
              <Link href="/settings" className="pill text-xs">{t('ui.settings')}</Link>
            </div>
          </div>
        </div>
      </AppShell>
    </AuthGate>
  );
}

function TutorDashboardSections() {
  const { me, assignments, rotations, residents, tutors, ownedRotationIds, petitions, todos } =
    useTutorDashboardData();
  const residentIdToName = (id: string) => residents.find((r) => r.uid === id)?.fullName || id;
  return (
    <Suspense
      fallback={
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }
    >
      <PendingApprovals petitions={petitions} residentIdToName={residentIdToName} />
      {me ? (
        <AssignedResidents
          meUid={me.uid}
          assignments={assignments}
          rotations={rotations}
          residents={residents}
          tutors={tutors}
          ownedRotationIds={ownedRotationIds}
        />
      ) : null}
      <TutorTodos todos={todos} onRefresh={() => {}} />
    </Suspense>
  );
}

function useTabsData() {
  const data = useTutorDashboardData();
  return { data } as const;
}

function TutorResidentsTab({
  onToast,
}: {
  onToast: (message: string, variant: 'success' | 'error') => void;
}) {
  const { data } = useTabsData();
  const { t } = useTranslation();
  const actions = {
    approvePetition: async (id: string) => {
      if (!data.me) return;
      try {
        await approveRotationPetition(id, data.me.uid);
        onToast(
          t('tutor.petitionApproved', { defaultValue: 'Petition approved successfully' }),
          'success',
        );
      } catch (error) {
        console.error('Failed to approve petition:', error);
        onToast(
          t('tutor.petitionApproveFailed', {
            defaultValue: 'Failed to approve petition. Please try again.',
          }),
          'error',
        );
      }
    },
    denyPetition: async (id: string) => {
      if (!data.me) return;
      try {
        await denyRotationPetition(id, data.me.uid);
        onToast(t('tutor.petitionDenied', { defaultValue: 'Petition denied' }), 'success');
      } catch (error) {
        console.error('Failed to deny petition:', error);
        onToast(
          t('tutor.petitionDenyFailed', {
            defaultValue: 'Failed to deny petition. Please try again.',
          }),
          'error',
        );
      }
    },
    selfAssign: async (residentId: string) => {
      if (!data.me) return;
      try {
        await assignTutorToResident(residentId, data.me.uid);
        onToast(
          t('tutor.assignSuccess', { defaultValue: 'Successfully assigned as tutor' }),
          'success',
        );
      } catch (error) {
        console.error('Failed to assign tutor:', error);
        onToast(
          t('tutor.assignFailed', { defaultValue: 'Failed to assign tutor. Please try again.' }),
          'error',
        );
      }
    },
    unassignSelf: async (residentId: string) => {
      if (!data.me) return;
      try {
        await unassignTutorFromResident(residentId, data.me.uid);
        onToast(t('tutor.unassignSuccess', { defaultValue: 'Successfully unassigned' }), 'success');
      } catch (error) {
        console.error('Failed to unassign tutor:', error);
        onToast(
          t('tutor.unassignFailed', { defaultValue: 'Failed to unassign. Please try again.' }),
          'error',
        );
      }
    },
  } as const;
  if (!data.me) return null;
  return (
    <div className="space-y-3">
      <ResidentsTab
        meUid={data.me.uid}
        residents={data.residents}
        assignments={data.assignments}
        rotations={data.rotations}
        petitions={data.petitions as any}
        ownedRotationIds={data.ownedRotationIds}
        onApprove={actions.approvePetition}
        onDeny={actions.denyPetition}
        onSelfAssign={actions.selfAssign}
        onUnassignSelf={actions.unassignSelf}
      />
    </div>
  );
}

function TutorTasksTab({
  onToast,
}: {
  onToast: (message: string, variant: 'success' | 'error') => void;
}) {
  const { data } = useTabsData();
  const { t } = useTranslation();
  const actions = {
    bulkApproveTasks: async (ids: string[]) => {
      if (!ids?.length) return;
      try {
        await updateTasksStatus({ taskIds: ids, status: 'approved' });
        onToast(
          t('tutor.tasksApproved', {
            defaultValue: `Successfully approved ${ids.length} task(s)`,
            count: ids.length,
          }),
          'success',
        );
      } catch (error) {
        console.error('Failed to approve tasks:', error);
        onToast(
          t('tutor.tasksApproveFailed', {
            defaultValue: 'Failed to approve tasks. Please try again.',
          }),
          'error',
        );
      }
    },
    bulkRejectTasks: async (ids: string[], _reason?: string) => {
      if (!ids?.length) return;
      try {
        await updateTasksStatus({ taskIds: ids, status: 'rejected' });
        onToast(
          t('tutor.tasksRejected', {
            defaultValue: `Successfully rejected ${ids.length} task(s)`,
            count: ids.length,
          }),
          'success',
        );
      } catch (error) {
        console.error('Failed to reject tasks:', error);
        onToast(
          t('tutor.tasksRejectFailed', {
            defaultValue: 'Failed to reject tasks. Please try again.',
          }),
          'error',
        );
      }
    },
  } as const;
  return (
    <div className="space-y-3">
      <TasksTab
        residents={data.residents}
        tasks={data.tasks as any}
        onBulkApprove={actions.bulkApproveTasks}
        onBulkReject={actions.bulkRejectTasks}
      />
    </div>
  );
}

function TutorRotationsTab() {
  const { data } = useTabsData();
  if (!data.me) return null;
  return (
    <div className="space-y-3">
      <RotationsTab
        meUid={data.me.uid}
        rotations={data.rotations}
        assignments={data.assignments}
        residents={data.residents}
        petitions={data.petitions as any}
      />
    </div>
  );
}

function TutorReflectionsInline() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { list, loading } = useReflectionsForTutor(me?.uid || null);
  return (
    <div className="space-y-3">
      <Card>
        <div className="font-semibold mb-2 text-gray-900 dark:text-gray-50">
          {t('tutor.reflectionsIWrote')}
        </div>
        {loading ? (
          <div className="text-sm opacity-70 text-gray-600 dark:text-gray-300">Loading…</div>
        ) : null}
        <div className="space-y-2">
          {(list || []).map((r) => (
            <div
              key={r.id}
              className="border rounded p-2 text-sm flex items-center justify-between border-gray-200 dark:border-[rgb(var(--border))]"
            >
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-50">{r.taskType}</div>
                <div className="text-xs opacity-70 text-gray-600 dark:text-gray-300">
                  {r.taskOccurrenceId}
                </div>
              </div>
              <div className="text-xs opacity-70 text-gray-600 dark:text-gray-300">
                {(r as any).submittedAt?.toDate?.()?.toLocaleString?.() || ''}
              </div>
            </div>
          ))}
          {!loading && !list?.length ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-[rgb(var(--border))] bg-gray-50 dark:bg-[rgb(var(--surface-elevated))] p-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('tutor.noReflectionsYet')}
              </p>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
