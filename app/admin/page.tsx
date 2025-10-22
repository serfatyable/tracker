'use client';
// Unused import removed: Link
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo as _useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Full modules omitted on dashboard; snapshots only
import { SpinnerSkeleton, CardSkeleton } from '../../components/dashboard/Skeleton';
import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import Button from '../../components/ui/Button';
// Tabs removed per mobile-first stacked sections
import { listUsers, listTasks } from '../../lib/firebase/admin';
import { getCurrentUserWithProfile } from '../../lib/firebase/auth';
import { getFirebaseStatus } from '../../lib/firebase/client';
import { useActiveAssignments } from '../../lib/hooks/useActiveAssignments';
import { useActiveRotations } from '../../lib/hooks/useActiveRotations';
import { useUsersByRole } from '../../lib/hooks/useUsersByRole';
import type { UserProfile } from '../../types/auth';

// Dynamically load heavy tab components (avoid React.lazy chunk issues in dev)
const KPICards = dynamic(() => import('../../components/admin/overview/KPICards'), {
  loading: () => <CardSkeleton />,
  ssr: false,
});
const PetitionsTable = dynamic(() => import('../../components/admin/overview/PetitionsTable'), {
  loading: () => <SpinnerSkeleton />,
  ssr: false,
});
// TutorLoadTable replaced by compact zero-load snapshot
const UnassignedQueues = dynamic(() => import('../../components/admin/overview/UnassignedQueues'), {
  loading: () => <SpinnerSkeleton />,
  ssr: false,
});
// Reflections/Rotations/Settings are standalone pages (not on dashboard)

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const firebaseOk = getFirebaseStatus().ok;
  // Render stacked dashboard; remove tab-era state

  // Badge helpers removed (not used on dashboard)
  const [, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      // Lightweight prefetch for possible snapshot metrics (optional)
      await listUsers({ limit: 1 });
      await listTasks({ limit: 1 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseOk) return;
    (async () => {
      const { firebaseUser, profile } = await getCurrentUserWithProfile();
      if (!firebaseUser) return router.replace('/auth');
      if (!profile || profile.status === 'pending') return router.replace('/awaiting-approval');
      if (profile.role !== 'admin') return router.replace('/auth');
      // Ensure core rotations exist each time an admin enters
      try {
        const mod = await import('../../lib/firebase/admin');
        if (typeof mod.ensureCoreRotationsSeeded === 'function') {
          await mod.ensureCoreRotationsSeeded();
        }
        if (typeof mod.ensureDefaultReflectionTemplatesSeeded === 'function') {
          await mod.ensureDefaultReflectionTemplatesSeeded();
        }
      } catch {
        // Seeding failed - continue anyway
      }
      await refresh();
    })();
  }, [router, firebaseOk, refresh]);

  // Rotation editor removed from dashboard

  // Users/tasks tables removed from dashboard

  function idsFrom(sel: Record<string, boolean>) {
    return Object.keys(sel).filter((k) => sel[k]);
  }

  // User/task actions removed from dashboard

  // Tab-era functions removed

  if (!firebaseOk) {
    return (
      <div className="min-h-dvh pad-safe-t pad-safe-b flex items-center justify-center p-6">
        <div className="card-levitate p-4 text-sm text-red-700">
          Firebase is not configured. Check your .env.local.
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.dashboard', { defaultValue: 'Dashboard' }) as string} />
      <div className="app-container flex min-h-dvh pad-safe-t pad-safe-b flex-col items-stretch justify-start p-6">
        <div className="w-full space-y-6">
          {/* 1) Overview */}
            <div className="space-y-4">
              <div className="card-levitate p-4">
                <Suspense fallback={<SpinnerSkeleton />}>
                  <PetitionsTable />
                </Suspense>
              </div>
              <OverviewTab />
              </div>

          {/* 4) Morning Meetings snapshot (CTA to full page) */}
          <div className="card-levitate p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}</div>
              <Button asChild variant="outline"><a href="/morning-meetings">{t('ui.open')}</a></Button>
            </div>
            <div className="mt-2 text-sm opacity-80">{t('overview.next7', { defaultValue: 'Snapshot of today and this month' })}</div>
                    </div>

          {/* 5) On-Call snapshot (CTA to full page) */}
          <div className="card-levitate p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t('ui.onCall', { defaultValue: 'On Call' })}</div>
              <Button asChild variant="outline"><a href="/on-call">{t('ui.open')}</a></Button>
            </div>
            <div className="mt-2 text-sm opacity-80">{t('overview.todaysTeam', { defaultValue: "Today's team snapshot" })}</div>
              </div>
        </div>
      </div>
    </AppShell>
  );
}

function OverviewTab() {
  const { assignments } = useActiveAssignments();
  const { residents, tutors } = useUsersByRole();
  const { rotations } = useActiveRotations();

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }
    >
      <div className="space-y-4">
        <KPICards assignments={assignments} residents={residents} tutors={tutors} />
        {/* Users snapshot: unassigned residents */}
          <UnassignedQueues assignments={assignments} residents={residents} rotations={rotations} />
        {/* Tutors with zero load */}
        <ZeroLoadTutors assignments={assignments} tutors={tutors} />
        {/* Tasks snapshot */}
        <TasksSnapshot />
        {/* Tasks snapshot placeholder (pending approvals/upcoming) can be added here when data is ready */}
      </div>
    </Suspense>
  );
}

function ZeroLoadTutors({ assignments, tutors }: { assignments: any[]; tutors: UserProfile[] }) {
  const { t } = useTranslation();
  const zero = (() => {
    const load = new Map<string, number>();
    for (const t of tutors) load.set(t.uid, 0);
    for (const a of assignments) for (const tid of a.tutorIds || []) load.set(tid, (load.get(tid) || 0) + 1);
    return tutors.filter((t) => (load.get(t.uid) || 0) === 0);
  })();
  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('overview.tutorsWithZeroLoad', { defaultValue: 'Tutors with zero load' })}</div>
      {zero.length === 0 ? (
        <div className="text-sm opacity-70">{t('overview.none', { defaultValue: 'None' })}</div>
      ) : (
        <ul className="text-sm list-disc pl-5">
          {zero.map((u) => (
            <li key={u.uid}>{u.fullName || u.uid}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TasksSnapshot() {
  const { t } = useTranslation();
  return (
    <div className="card-levitate p-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{t('ui.tasks')}</div>
        <Button asChild variant="outline"><a href="/admin/tasks">{t('ui.open')}</a></Button>
      </div>
      <div className="mt-2 text-sm opacity-80">
        {t('overview.tasksSnapshot', { defaultValue: 'Pending approvals and upcoming items' })}
      </div>
    </div>
  );
}
