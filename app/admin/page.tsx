'use client';

import { useRouter } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import type { UserProfile } from '../../types/auth';
import ActivityHeatmap from '../../components/admin/overview/ActivityHeatmap';
import CollapsiblePetitions from '../../components/admin/overview/CollapsiblePetitions';
import PeopleInsights from '../../components/admin/overview/PeopleInsights';
import PriorityDashboard from '../../components/admin/overview/PriorityDashboard';
import QuickAccessGrid from '../../components/admin/overview/QuickAccessGrid';
import RecentActivityFeed from '../../components/admin/overview/RecentActivityFeed';
import RotationPopularity from '../../components/admin/overview/RotationPopularity';
import TutorLoadChart from '../../components/admin/overview/TutorLoadChart';
import WelcomeHeader from '../../components/admin/overview/WelcomeHeader';
import { SpinnerSkeleton, CardSkeleton } from '../../components/dashboard/Skeleton';
import AppShell from '../../components/layout/AppShell';
import { getCurrentUserWithProfile } from '../../lib/firebase/auth';
import { getFirebaseStatus } from '../../lib/firebase/client';
import { useActiveAssignments } from '../../lib/hooks/useActiveAssignments';
import { useActiveRotations } from '../../lib/hooks/useActiveRotations';
import { useAllAssignments } from '../../lib/hooks/useAllAssignments';
import { usePendingTasksCount } from '../../lib/hooks/usePendingTasksCount';
import { useRecentActivity } from '../../lib/hooks/useRecentActivity';
import { useRotationCoverage } from '../../lib/hooks/useRotationCoverage';
import { useTodayOnCall } from '../../lib/hooks/useTodayOnCall';
import { useUpcomingMeetings } from '../../lib/hooks/useUpcomingMeetings';
import { useUsersByRole } from '../../lib/hooks/useUsersByRole';

export default function AdminDashboard(): React.ReactElement {
  const router = useRouter();
  const firebaseOk = getFirebaseStatus().ok;
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [petitionsExpanded, setPetitionsExpanded] = useState(false);

  useEffect(() => {
    if (!firebaseOk) return;
    (async () => {
      const { firebaseUser, profile } = await getCurrentUserWithProfile();
      if (!firebaseUser) return router.replace('/auth');
      if (profile?.status === 'pending') return router.replace('/awaiting-approval');
      if (profile && profile.role !== 'admin') return router.replace('/auth');

      setCurrentUserName(profile?.fullName || '');

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
    })();
  }, [router, firebaseOk]);

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
      <div className="app-container flex min-h-dvh pad-safe-t pad-safe-b flex-col items-stretch justify-start p-6">
        <Suspense fallback={<SpinnerSkeleton />}>
          <DashboardContent
            userName={currentUserName}
            petitionsExpanded={petitionsExpanded}
            onTogglePetitions={() => setPetitionsExpanded(!petitionsExpanded)}
          />
        </Suspense>
      </div>
    </AppShell>
  );
}

function DashboardContent({
  userName,
  petitionsExpanded,
  onTogglePetitions,
}: {
  userName: string;
  petitionsExpanded: boolean;
  onTogglePetitions: () => void;
}): React.ReactElement {
  // Hooks for data
  const { assignments: activeAssignments } = useActiveAssignments();
  const { assignments: allAssignments } = useAllAssignments();
  const { residents, tutors } = useUsersByRole();
  const { rotations } = useActiveRotations();
  const { count: pendingTasksCount } = usePendingTasksCount();
  const { count: upcomingMeetingsCount } = useUpcomingMeetings(7);
  const { schedule: todayOnCall } = useTodayOnCall();
  const { activities } = useRecentActivity(10, 24);
  const { coverage: rotationCoverage } = useRotationCoverage();

  // All users (residents + tutors for now - can be extended)
  const allUsers = useMemo(() => [...residents, ...tutors], [residents, tutors]);

  // Calculations
  const stats = useMemo(() => {
    // Pending petitions count (placeholder for now)
    const pendingPetitionsCount = 0;

    // Pending users
    const pendingUsersCount = allUsers.filter((u: UserProfile) => u.status === 'pending').length;

    // Unassigned residents
    const assignedResidentIds = new Set(allAssignments.map((a) => a.residentId));
    const unassignedResidentsCount = residents.filter(
      (r) => !assignedResidentIds.has(r.uid),
    ).length;

    // Tutor load balance (std dev)
    const load = new Map<string, number>();
    for (const t of tutors) load.set(t.uid, 0);
    for (const a of activeAssignments)
      for (const tid of a.tutorIds || []) load.set(tid, (load.get(tid) || 0) + 1);
    const counts = Array.from(load.values());
    const mean = counts.reduce((s, n) => s + n, 0) / (counts.length || 1);
    const variance =
      counts.reduce((s, n) => s + Math.pow(n - mean, 2), 0) / (counts.length || 1);
    const tutorLoadBalance = Number.isFinite(Math.sqrt(variance))
      ? Number(Math.sqrt(variance).toFixed(1))
      : 0;

    // On-call today summary
    const onCallToday =
      todayOnCall?.residents && todayOnCall.residents.length > 0
        ? `${todayOnCall.residents.length} residents`
        : undefined;

    return {
      pendingPetitionsCount,
      pendingUsersCount,
      unassignedResidentsCount,
      tutorLoadBalance,
      onCallToday,
    };
  }, [allUsers, allAssignments, residents, tutors, activeAssignments, todayOnCall]);

  return (
    <div className="w-full space-y-8">
      {/* 1. Welcome Header */}
      <WelcomeHeader
        userName={userName}
        pendingActions={stats.pendingPetitionsCount + stats.pendingUsersCount + pendingTasksCount}
        activeResidents={residents.length}
        totalRotations={rotations.length}
      />

      {/* 2. Priority Dashboard */}
      <PriorityDashboard
        pendingPetitionsCount={stats.pendingPetitionsCount}
        pendingUsersCount={stats.pendingUsersCount}
        unassignedResidentsCount={stats.unassignedResidentsCount}
        activeAssignmentsCount={activeAssignments.length}
        tutorLoadBalance={stats.tutorLoadBalance}
        rotationCoverage={rotationCoverage}
        upcomingMeetingsCount={upcomingMeetingsCount}
        recentActivityCount={activities.length}
        onExpandPetitions={onTogglePetitions}
      />

      {/* 3. Collapsible Petitions Section */}
      <CollapsiblePetitions initialExpanded={petitionsExpanded} />

      {/* 4. Quick Access Grid */}
      <QuickAccessGrid
        usersCount={allUsers.length}
        rotationsCount={rotations.length}
        pendingTasksCount={pendingTasksCount}
        upcomingMeetingsCount={upcomingMeetingsCount}
        onCallToday={stats.onCallToday}
      />

      {/* 5. Visual Insights Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Visual Insights</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tutor Load Chart */}
          <Suspense fallback={<CardSkeleton />}>
            <TutorLoadChart assignments={activeAssignments} tutors={tutors} />
          </Suspense>

          {/* Rotation Popularity */}
          <Suspense fallback={<CardSkeleton />}>
            <RotationPopularity assignments={activeAssignments} rotations={rotations} />
          </Suspense>

          {/* Activity Heatmap */}
          <Suspense fallback={<CardSkeleton />}>
            <ActivityHeatmap activities={activities} />
          </Suspense>

          {/* Recent Activity Feed */}
          <Suspense fallback={<CardSkeleton />}>
            <RecentActivityFeed activities={activities} />
          </Suspense>
        </div>
      </div>

      {/* 6. People Insights */}
      <Suspense fallback={<CardSkeleton />}>
        <PeopleInsights
          assignments={allAssignments}
          residents={residents}
          tutors={tutors}
          rotations={rotations}
          allUsers={allUsers}
        />
      </Suspense>
    </div>
  );
}
