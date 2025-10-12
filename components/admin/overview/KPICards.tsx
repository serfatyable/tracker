'use client';
import { useMemo } from 'react';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

type Props = {
  assignments: Assignment[];
  residents: UserProfile[];
  tutors: UserProfile[];
};

export default function KPICards({ assignments, residents, tutors }: Props) {
  const { unassignedResidentsCount, tutorsWithZeroLoad } = useMemo(() => {
    const assignedResidentIds = new Set(assignments.map((a) => a.residentId));
    const unassigned = residents.filter(
      (r) => r.role === 'resident' && assignedResidentIds.has(r.uid) === false,
    );
    const tutorLoad = new Map<string, number>();
    for (const t of tutors) tutorLoad.set(t.uid, 0);
    for (const a of assignments)
      for (const tid of a.tutorIds || []) tutorLoad.set(tid, (tutorLoad.get(tid) || 0) + 1);
    const zeroLoad = tutors.filter((t) => (tutorLoad.get(t.uid) || 0) === 0);
    return { unassignedResidentsCount: unassigned.length, tutorsWithZeroLoad: zeroLoad.length };
  }, [assignments, residents, tutors]);

  const kpis = [
    { label: 'Residents', value: residents.length, icon: IconUsers },
    {
      label: 'Active rotations',
      value: new Set(assignments.map((a) => a.rotationId)).size,
      icon: IconActivity,
    },
    {
      label: 'Tutors active now',
      value: new Set(assignments.flatMap((a) => a.tutorIds || [])).size,
      icon: IconTutor,
    },
    { label: 'Unassigned residents', value: unassignedResidentsCount, icon: IconAlert },
    { label: 'Tutors with zero load', value: tutorsWithZeroLoad, icon: IconIdle },
  ] as const;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="glass-card card-levitate p-4">
          <div className="flex items-center gap-2 mb-1">
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-300">
              <k.icon />
            </div>
            <div className="text-xs opacity-70">{k.label}</div>
          </div>
          <div className="text-2xl font-semibold">{k.value}</div>
        </div>
      ))}
    </div>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M16 11c1.66 0 3-1.79 3-4s-1.34-4-3-4-3 1.79-3 4 1.34 4 3 4Zm-8 0c1.66 0 3-1.79 3-4S9.66 3 8 3 5 4.79 5 7s1.34 4 3 4Zm0 2c-2.67 0-8 1.34-8 4v2h10v-2c0-2.66-5.33-4-8-4Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.96 1.97 3.45v2h8v-2c0-2.66-5.33-4-8-4Z" />
    </svg>
  );
}

function IconActivity() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 3l2.12 6.36H21l-5.18 3.76L17.94 21 12 16.9 6.06 21l2.12-7.88L3 9.36h6.88L12 3Z" />
    </svg>
  );
}

function IconTutor() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 2 1 7l11 5 9-4.09V17h2V7L12 2Zm0 13L5 12.2V17l7 3 7-3v-4.8L12 15Z" />
    </svg>
  );
}

function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M1 21h22L12 2 1 21Zm12-3h-2v2h2v-2Zm0-6h-2v5h2v-5Z" />
    </svg>
  );
}

function IconIdle() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
      <path d="M12 22c5.52 0 10-4.48 10-10S17.52 2 12 2 2 6.48 2 12s4.48 10 10 10Zm1-10V7h-2v7h6v-2h-4Z" />
    </svg>
  );
}
