'use client';

import { Suspense } from 'react';

import AuthGate from '@/components/auth/AuthGate';
import { SpinnerSkeleton, CardSkeleton } from '@/components/dashboard/Skeleton';
import AppShell from '@/components/layout/AppShell';
import TutorActivityTimeline from '@/components/tutor/TutorActivityTimeline';
import TutorHeroSection from '@/components/tutor/TutorHeroSection';
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

      {/* Bottom spacing for better scrolling */}
      <div className="h-8" />
    </div>
  );
}
