'use client';
import Link from 'next/link';
import { lazy, Suspense, useMemo as _useMemo, useState } from 'react';
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
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForTutor } from '../../lib/hooks/useReflections';
import { useTutorDashboardData } from '../../lib/hooks/useTutorDashboardData';

// Lazy load heavy components
const AssignedResidents = lazy(() => import('../../components/tutor/AssignedResidents'));
const PendingApprovals = lazy(() => import('../../components/tutor/PendingApprovals'));
const RotationsTab = lazy(() => import('../../components/tutor/tabs/RotationsTab'));
const TutorTodos = lazy(() => import('../../components/tutor/TutorTodos'));

export default function TutorDashboard() {
  const { t } = useTranslation();
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  const _handleToast = (message: string, variant: 'success' | 'error') => {
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
              <Link href="/settings" className="pill text-xs">
                {t('ui.settings')}
              </Link>
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

// Removed tab-era inline helpers

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
