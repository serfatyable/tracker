'use client';

import { useMemo } from 'react';

import type { UserProfile } from '@/types/auth';

import { useTutorDashboardData } from './useTutorDashboardData';

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

    // Calculate completion rate (mock for now - should be based on actual task completion data)
    const completionRate = residentsCount > 0 ? Math.floor(Math.random() * 30 + 70) : 0;

    // Calculate average response time (mock for now - should be based on actual approval timestamps)
    const avgResponseTime = '2.3h';

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
