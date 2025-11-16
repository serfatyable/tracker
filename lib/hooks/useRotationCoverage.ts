'use client';
import { useMemo } from 'react';

import type { Assignment } from '../../types/assignments';
import { useActiveAssignments } from './useActiveAssignments';
import { useActiveRotations } from './useActiveRotations';

export function useRotationCoverage() {
  const { assignments, loading: assignmentsLoading } = useActiveAssignments();
  const { rotations, loading: rotationsLoading } = useActiveRotations();

  const coverage = useMemo(() => {
    if (rotations.length === 0) return 0;

    // Get unique rotation IDs from active assignments
    const rotationIdsWithAssignments = new Set(
      assignments.map((a: Assignment) => a.rotationId),
    );

    // Calculate percentage
    const coveredCount = rotations.filter((r) => rotationIdsWithAssignments.has(r.id)).length;
    return Math.round((coveredCount / rotations.length) * 100);
  }, [assignments, rotations]);

  return {
    coverage,
    coveredRotations: rotations.filter((r) =>
      assignments.some((a: Assignment) => a.rotationId === r.id),
    ).length,
    totalRotations: rotations.length,
    loading: assignmentsLoading || rotationsLoading,
  } as const;
}
