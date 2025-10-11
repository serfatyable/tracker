"use client";
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
        const unassigned = residents.filter((r) => r.role === 'resident' && assignedResidentIds.has(r.uid) === false);
        const tutorLoad = new Map<string, number>();
        for (const t of tutors) tutorLoad.set(t.uid, 0);
        for (const a of assignments) for (const tid of a.tutorIds || []) tutorLoad.set(tid, (tutorLoad.get(tid) || 0) + 1);
        const zeroLoad = tutors.filter((t) => (tutorLoad.get(t.uid) || 0) === 0);
        return { unassignedResidentsCount: unassigned.length, tutorsWithZeroLoad: zeroLoad.length };
    }, [assignments, residents, tutors]);

    const kpis = [
        { label: 'Residents', value: residents.length },
        { label: 'Active rotations', value: new Set(assignments.map((a) => a.rotationId)).size },
        { label: 'Tutors active now', value: new Set(assignments.flatMap((a) => a.tutorIds || [])).size },
        { label: 'Unassigned residents', value: unassignedResidentsCount },
        { label: 'Tutors with zero load', value: tutorsWithZeroLoad },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {kpis.map((k) => (
                <div key={k.label} className="glass-card p-4">
                    <div className="text-xs opacity-70">{k.label}</div>
                    <div className="text-2xl font-semibold">{k.value}</div>
                </div>
            ))}
        </div>
    );
}


