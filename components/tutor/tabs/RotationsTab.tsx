'use client';
import { useMemo } from 'react';
import type { Assignment } from '../../../types/assignments';
import type { Rotation } from '../../../types/rotations';
import type { UserProfile } from '../../../types/auth';
import type { RotationPetition } from '../../../types/rotationPetitions';
import Button from '../../ui/Button';

type Props = {
  meUid: string;
  rotations: Rotation[];
  assignments: Assignment[];
  residents: UserProfile[];
  petitions: RotationPetition[];
};

export default function RotationsTab({
  meUid,
  rotations,
  assignments,
  residents,
  petitions,
}: Props) {
  const owned = useMemo(
    () =>
      rotations
        .filter((r) => (r.ownerTutorIds || []).includes(meUid))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [rotations, meUid],
  );
  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const assignmentsByRotation = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const arr = map.get(a.rotationId) || [];
      arr.push(a);
      map.set(a.rotationId, arr);
    }
    return map;
  }, [assignments]);
  const petitionsByRotation = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of petitions) map.set(p.rotationId, (map.get(p.rotationId) || 0) + 1);
    return map;
  }, [petitions]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {owned.map((r) => {
        const assigns = assignmentsByRotation.get(r.id) || [];
        const residentsCount = assigns.length;
        const pendingPetitions = petitionsByRotation.get(r.id) || 0;
        return (
          <div key={r.id} className="glass-card card-levitate p-3">
            <div className="font-semibold mb-1">{r.name}</div>
            <div className="text-sm opacity-80">Residents: {residentsCount}</div>
            <div className="text-sm opacity-80">Pending petitions: {pendingPetitions}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                size="sm"
                className="btn-levitate"
                variant="outline"
                onClick={() => window.open(`/curriculum?rotation=${r.id}`, '_self')}
              >
                Open curriculum
              </Button>
              <Button
                size="sm"
                className="btn-levitate"
                variant="outline"
                onClick={() => window.open(`/tutor?tab=residents&rotation=${r.id}`, '_self')}
              >
                View residents
              </Button>
            </div>
            <div className="mt-2 text-xs opacity-70">
              Owners: {(r.ownerTutorIds || []).join(', ') || '-'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
