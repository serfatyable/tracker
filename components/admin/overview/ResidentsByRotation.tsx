"use client";
import { useMemo, useState } from 'react';

import type { Assignment } from '../../../types/assignments';
import type { Rotation } from '../../../types/rotations';
import type { UserProfile } from '../../../types/auth';
import Button from '../../ui/Button';
import Select from '../../ui/Select';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import { assignResidentToRotation, assignTutorToResident, unassignTutorFromResident } from '../../../lib/firebase/admin';

type Props = {
    assignments: Assignment[];
    rotations: Rotation[];
    residents: UserProfile[];
    tutors: UserProfile[];
};

function yearsSince(dateStr?: string): number | null {
    if (!dateStr) return null;
    const start = new Date(dateStr + 'T00:00:00Z');
    const now = new Date();
    const years = now.getUTCFullYear() - start.getUTCFullYear();
    return years >= 0 ? years : 0;
}

export default function ResidentsByRotation({ assignments, rotations, residents, tutors }: Props) {
    const [moveState, setMoveState] = useState<{ residentId: string; rotationId: string } | null>(null);
    const [tutorAssignState, setTutorAssignState] = useState<{ residentId: string } | null>(null);
    const [unassignState, setUnassignState] = useState<{ residentId: string; tutorId: string } | null>(null);

    const rotationIdToResidents = useMemo(() => {
        const resById = new Map(residents.map((r) => [r.uid, r]));
        const map = new Map<string, { resident: UserProfile; tutorIds: string[] }[]>();
        for (const a of assignments) {
            const resident = resById.get(a.residentId);
            if (!resident) continue;
            const arr = map.get(a.rotationId) || [];
            arr.push({ resident, tutorIds: a.tutorIds || [] });
            map.set(a.rotationId, arr);
        }
        return map;
    }, [assignments, residents]);

    const onMoveConfirm = async () => {
        if (!moveState) return;
        await assignResidentToRotation(moveState.residentId, moveState.rotationId);
        setMoveState(null);
    };

    const onAssignTutor = async (residentId: string, tutorId: string) => {
        await assignTutorToResident(residentId, tutorId);
        setTutorAssignState(null);
    };

    const onUnassignTutor = async (residentId: string, tutorId: string) => {
        await unassignTutorFromResident(residentId, tutorId);
    };

    return (
        <div className="flex gap-3 overflow-x-auto">
            {rotations.map((rot) => {
                const grouped = rotationIdToResidents.get(rot.id) || [];
                return (
                    <div key={rot.id} className="min-w-[260px] glass-card p-3">
                        <div className="font-semibold mb-2 flex items-center justify-between">
                            <span>{rot.name}</span>
                            <span className="text-xs opacity-70">{grouped.length}</span>
                        </div>
                        <div className="space-y-2">
                            {grouped.map(({ resident, tutorIds }) => (
                                <div key={resident.uid} className="border rounded p-2">
                                    <div className="text-sm font-medium flex items-center justify-between">
                                        <span>{resident.fullName || resident.uid}</span>
                                        <span className="text-xs opacity-70">{(() => { const y = yearsSince((resident as any).residencyStartDate); return y == null ? 'PGY -' : `PGY ${Math.max(1, y + 1)}`; })()}</span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                                        {(tutorIds || []).map((tid) => {
                                            const t = tutors.find((u) => u.uid === tid);
                                            return (
                                                <span key={tid} className="px-2 py-0.5 text-xs rounded bg-gray-200 dark:bg-gray-700">
                                                    {(t && t.fullName) || tid}
                                                    <button className="ml-1 text-red-600" onClick={() => setUnassignState({ residentId: resident.uid, tutorId: tid })}>×</button>
                                                </span>
                                            );
                                        })}
                                        <Button size="sm" onClick={() => setTutorAssignState({ residentId: resident.uid })}>Assign tutor</Button>
                                        <Button size="sm" variant="secondary" onClick={() => setMoveState({ residentId: resident.uid, rotationId: rot.id })}>Move</Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}

            <Dialog open={!!moveState} onClose={() => setMoveState(null)}>
                <div className="p-3 space-y-2">
                    <DialogHeader>Move resident to rotation</DialogHeader>
                    <Select value={moveState?.rotationId || ''} onChange={(e) => setMoveState((s) => s ? ({ ...s, rotationId: e.target.value }) : s)}>
                        <option value="" disabled>Select rotation</option>
                        {rotations.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                    </Select>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setMoveState(null)}>Cancel</Button>
                        <Button onClick={onMoveConfirm} disabled={!moveState?.rotationId}>Confirm</Button>
                    </DialogFooter>
                </div>
            </Dialog>

            <Dialog open={!!tutorAssignState} onClose={() => setTutorAssignState(null)}>
                <div className="p-3 space-y-2">
                    <DialogHeader>Assign tutor</DialogHeader>
                    <Select defaultValue="" onChange={(e) => onAssignTutor(tutorAssignState!.residentId, e.target.value)}>
                        <option value="" disabled>Select tutor</option>
                        {tutors.map((t) => (
                            <option key={t.uid} value={t.uid}>{t.fullName || t.uid}</option>
                        ))}
                    </Select>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setTutorAssignState(null)}>Close</Button>
                    </DialogFooter>
                </div>
            </Dialog>

            <Dialog open={!!unassignState} onClose={() => setUnassignState(null)}>
                <div className="p-3 space-y-2">
                    <DialogHeader>Unassign tutor</DialogHeader>
                    <div className="text-sm">Are you sure you want to unassign this tutor from the resident?</div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setUnassignState(null)}>Cancel</Button>
                        <Button onClick={async () => { if (!unassignState) return; await onUnassignTutor(unassignState.residentId, unassignState.tutorId); setUnassignState(null); }}>Unassign</Button>
                    </DialogFooter>
                </div>
            </Dialog>
        </div>
    );
}


