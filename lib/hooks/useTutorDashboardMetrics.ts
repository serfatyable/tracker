'use client';

import { useMemo } from 'react';

import { useTutorDashboardData } from './useTutorDashboardData';

import type { UserProfile } from '@/types/auth';


export type TutorDashboardMetrics = {
  // Hero section metrics
  pendingCount: number;
  residentsCount: number;
  completionRate: number;

  // KPI metrics
  avgResponseTime: string;
  teachingLoad: number;

  // Helper functions
  residentIdToName: (id: string) => string;
  residentIdToEmail: (id: string) => string | undefined;
};

export function useTutorDashboardMetrics() {
  const data = useTutorDashboardData();

  const metrics = useMemo<TutorDashboardMetrics>(() => {
    const pendingCount = (data.petitions?.length || 0) + (data.tasks?.length || 0);
    const residentsCount = data.supervisedResidents?.length || 0;

    // TODO: Calculate actual completion rate from historical task data
    // This would require:
    // 1. Fetching approved/rejected tasks for supervised residents
    // 2. Calculating: (approved tasks / total required tasks) * 100
    // For now, showing 0 to indicate data not yet available
    const completionRate = 0;

    // TODO: Calculate actual average response time from task timestamps
    // This would require:
    // 1. Fetching completed tasks (approved/rejected) with timestamps
    // 2. Calculating: avg(approvalTimestamp - submissionTimestamp)
    // For now, showing "--" to indicate data not yet available
    const avgResponseTime = '--';

    // Teaching load is the number of assigned residents
    const teachingLoad = residentsCount;

    // Helper to get resident name
    const residentIdToName = (id: string): string => {
      const resident = data.residents.find((r) => r.uid === id);
      return resident?.fullName || resident?.email || id;
    };

    // Helper to get resident email
    const residentIdToEmail = (id: string): string | undefined => {
      const resident = data.residents.find((r) => r.uid === id);
      return resident?.email || undefined;
    };

    return {
      pendingCount,
      residentsCount,
      completionRate,
      avgResponseTime,
      teachingLoad,
      residentIdToName,
      residentIdToEmail,
    };
  }, [data]);

  return {
    ...data,
    metrics,
  };
}
