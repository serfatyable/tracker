'use client';
import {
  UserGroupIcon,
  RectangleStackIcon,
  ExclamationTriangleIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

type Props = {
  assignments: Assignment[];
  residents: UserProfile[];
  tutors: UserProfile[];
};

export default function KPICards({ assignments, residents, tutors }: Props) {
  const { t } = useTranslation();
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
    { label: t('admin.kpi.residents'), value: residents.length, icon: UserGroupIcon },
    {
      label: t('admin.kpi.activeRotations'),
      value: new Set(assignments.map((a) => a.rotationId)).size,
      icon: RectangleStackIcon,
    },
    {
      label: t('admin.kpi.tutorsActive'),
      value: new Set(assignments.flatMap((a) => a.tutorIds || [])).size,
      icon: UserGroupIcon,
    },
    {
      label: t('admin.kpi.unassignedResidents'),
      value: unassignedResidentsCount,
      icon: ExclamationTriangleIcon,
    },
    { label: t('admin.kpi.tutorsZeroLoad'), value: tutorsWithZeroLoad, icon: UserMinusIcon },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {kpis.map((k) => (
        <div key={k.label} className="card-levitate p-4">
          <div className="flex items-center gap-2 mb-1 rtl:flex-row-reverse rtl:justify-end">
            <div className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary">
              <k.icon className="h-4 w-4" aria-hidden />
            </div>
            <div className="text-xs opacity-70">{k.label}</div>
          </div>
          <div className="text-2xl font-semibold">{k.value}</div>
        </div>
      ))}
    </div>
  );
}
