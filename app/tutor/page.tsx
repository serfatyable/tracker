'use client';

import { Suspense } from 'react';

import AuthGate from '@/components/auth/AuthGate';
import { SpinnerSkeleton, CardSkeleton } from '@/components/dashboard/Skeleton';
import AppShell from '@/components/layout/AppShell';
import PendingTaskApprovals from '@/components/tutor/PendingTaskApprovals';
import TutorActivityTimeline from '@/components/tutor/TutorActivityTimeline';
import TutorHeroSection from '@/components/tutor/TutorHeroSection';
import TutorInsightsPanel from '@/components/tutor/TutorInsightsPanel';
import TutorKPICards from '@/components/tutor/TutorKPICards';
import TutorPriorityQueue from '@/components/tutor/TutorPriorityQueue';
import TutorQuickActions from '@/components/tutor/TutorQuickActions';
import TutorResidentsCards from '@/components/tutor/TutorResidentsCards';
import TutorRotationsGrid from '@/components/tutor/TutorRotationsGrid';
import { useTutorDashboardMetrics } from '@/lib/hooks/useTutorDashboardMetrics';

export default function TutorDashboard() {
  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <div className="app-container min-h-screen bg-gradient-to-b from-gray-50/50 to-white p-6 dark:from-slate-950/50 dark:to-slate-900">
          <Suspense fallback={<SpinnerSkeleton />}>
            <TutorDashboardContent />
          </Suspense>
        </div>
      </AppShell>
    </AuthGate>
  );
}

function TutorDashboardContent() {
  const data = useTutorDashboardMetrics();
  const { metrics } = data;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Hero Section */}
      <Suspense
        fallback={<div className="h-64 animate-pulse rounded-2xl bg-gray-200 dark:bg-gray-800" />}
      >
        <TutorHeroSection
          user={data.me}
          pendingCount={metrics.pendingCount}
          residentsCount={metrics.residentsCount}
          completionRate={metrics.completionRate}
        />
      </Suspense>

      {/* Quick Actions Toolbar */}
      <Suspense fallback={<CardSkeleton />}>
        <TutorQuickActions pendingCount={metrics.pendingCount} />
      </Suspense>

      {/* KPI Cards */}
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
        }
      >
        <TutorKPICards
          pendingApprovals={metrics.pendingCount}
          assignedResidents={metrics.residentsCount}
          avgResponseTime={metrics.avgResponseTime}
          teachingLoad={metrics.teachingLoad}
        />
      </Suspense>

      {/* Priority Queue - Pending Approvals */}
      {data.petitions && data.petitions.length > 0 && (
        <Suspense fallback={<CardSkeleton />}>
          <TutorPriorityQueue
            petitions={data.petitions}
            residentIdToName={metrics.residentIdToName}
            residentIdToEmail={metrics.residentIdToEmail}
          />
        </Suspense>
      )}

      {/* Pending Task Approvals */}
      {data.tasks && data.tasks.length > 0 && (
        <Suspense fallback={<CardSkeleton />}>
          <PendingTaskApprovals
            tasks={data.tasks}
            residents={data.residents}
            rotations={data.rotations}
          />
        </Suspense>
      )}

      {/* Two-column layout for Residents and Activity */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Assigned Residents Cards */}
        <Suspense fallback={<CardSkeleton />}>
          <TutorResidentsCards
            meUid={data.me?.uid || ''}
            assignments={data.assignments}
            rotations={data.rotations}
            residents={data.residents}
            ownedRotationIds={data.ownedRotationIds}
          />
        </Suspense>

        {/* Activity Timeline */}
        <Suspense fallback={<CardSkeleton />}>
          <TutorActivityTimeline />
        </Suspense>
      </div>

      {/* Rotations Grid */}
      <Suspense fallback={<CardSkeleton />}>
        <TutorRotationsGrid
          meUid={data.me?.uid || ''}
          rotations={data.rotations}
          assignments={data.assignments}
          residents={data.residents}
          petitions={data.petitions || []}
          tutors={data.tutors}
        />
      </Suspense>

      {/* Insights Panel */}
      <Suspense fallback={<CardSkeleton />}>
        <TutorInsightsPanel />
      </Suspense>

      {/* Bottom spacing for better scrolling */}
      <div className="h-8" />
    </div>
  );
}
