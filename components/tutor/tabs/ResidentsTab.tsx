'use client';
import { useMemo, useState } from 'react';

import { createSynonymMatcher } from '../../../lib/search/synonyms';
import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';
import type { RotationPetition } from '../../../types/rotationPetitions';
import type { Rotation } from '../../../types/rotations';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

type Props = {
  meUid: string;
  residents: UserProfile[];
  assignments: Assignment[];
  rotations: Rotation[];
  petitions: RotationPetition[];
  ownedRotationIds: Set<string>;
  filterRotationId?: string;
  onApprove: (petitionId: string) => Promise<void>;
  onDeny: (petitionId: string) => Promise<void>;
  onSelfAssign: (residentId: string) => Promise<void>;
  onUnassignSelf: (residentId: string) => Promise<void>;
};

export default function ResidentsTab({
  meUid,
  residents,
  assignments,
  rotations,
  petitions,
  ownedRotationIds,
  filterRotationId,
  onApprove,
  onDeny,
  onSelfAssign,
  onUnassignSelf,
}: Props) {
  const [search, setSearch] = useState('');
  const [onlyWithPetitions, setOnlyWithPetitions] = useState(false);
  const [onlyOwned, setOnlyOwned] = useState(false);

  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const rotById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);
  const petitionsByResident = useMemo(() => {
    const map = new Map<string, RotationPetition[]>();
    for (const p of petitions) {
      const arr = map.get(p.residentId) || [];
      arr.push(p);
      map.set(p.residentId, arr);
    }
    return map;
  }, [petitions]);
  const myAssignments = useMemo(
    () => assignments.filter((a) => (a.tutorIds || []).includes(meUid)),
    [assignments, meUid],
  );
  const pendingTasksCount = useMemo(() => {
    // placeholder: in v2, the page will pass grouped tasks or counts; leave 0 here
    return new Map<string, number>();
  }, []);

  const searchMatcher = useMemo(() => createSynonymMatcher(search), [search]);
  const hasSearch = search.trim().length > 0;

  const cards = useMemo(() => {
    const list = myAssignments
      .map((a) => ({
        assignment: a,
        resident: resById.get(a.residentId),
        rotation: rotById.get(a.rotationId),
        petitions: petitionsByResident.get(a.residentId) || [],
      }))
      .filter((x) => x.resident && x.rotation) as Array<{
      assignment: Assignment;
      resident: UserProfile;
      rotation: Rotation;
      petitions: RotationPetition[];
    }>;
    return list
      .filter((x) => {
        if (hasSearch) {
          const haystackParts = [x.resident.fullName, x.resident.email, x.rotation.name];
          if (!haystackParts.some((part) => searchMatcher(part || ''))) return false;
        }
        if (onlyWithPetitions && (x.petitions || []).length === 0) return false;
        if (onlyOwned && !ownedRotationIds.has(x.rotation.id)) return false;
        if (filterRotationId && x.rotation.id !== filterRotationId) return false;
        return true;
      })
      .sort((a, b) =>
        (a.resident.fullName || a.resident.uid).localeCompare(
          b.resident.fullName || b.resident.uid,
        ),
      );
  }, [
    myAssignments,
    resById,
    rotById,
    petitionsByResident,
    onlyWithPetitions,
    onlyOwned,
    ownedRotationIds,
    filterRotationId,
    searchMatcher,
    hasSearch,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Input
          className="flex-1"
          placeholder="Search residents..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {/* Quick filters */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => setOnlyWithPetitions((v) => !v)}
          className={`pill text-xs ${onlyWithPetitions ? 'ring-2 ring-primary' : ''}`}
        >
          Has pending petition
        </button>
        <button
          type="button"
          onClick={() => setOnlyOwned((v) => !v)}
          className={`pill text-xs ${onlyOwned ? 'ring-2 ring-primary' : ''}`}
        >
          My owned rotations
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map(({ assignment, resident, rotation, petitions }) => {
          const onOwnedRotation = ownedRotationIds.has(rotation.id);
          const hasMe = (assignment.tutorIds || []).includes(meUid);
          const p = petitions[0];
          const tasksCount = pendingTasksCount.get(resident.uid) || 0;
          return (
            <div key={assignment.id} className="card-levitate p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold">{resident.fullName || resident.uid}</div>
                {p ? (
                  <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">
                    {p.type === 'activate' ? 'Activate' : 'Finish'}
                  </span>
                ) : null}
              </div>
              <div className="text-sm opacity-80">{rotation.name}</div>
              <div className="text-xs opacity-60">Pending tasks: {tasksCount}</div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  className="btn-levitate"
                  variant="outline"
                  onClick={() => window.open(`/residents/${resident.uid}`, '_self')}
                >
                  Open profile
                </Button>
                {onOwnedRotation && !hasMe ? (
                  <Button
                    size="sm"
                    className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                    variant="outline"
                    onClick={() => onSelfAssign(resident.uid)}
                  >
                    Self-assign
                  </Button>
                ) : null}
                {onOwnedRotation && hasMe ? (
                  <Button
                    size="sm"
                    className="btn-levitate border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    variant="outline"
                    onClick={() => onUnassignSelf(resident.uid)}
                  >
                    Unassign
                  </Button>
                ) : null}
                {p ? (
                  <>
                    <Button
                      size="sm"
                      className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                      variant="outline"
                      onClick={() => onApprove(p.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                      variant="outline"
                      onClick={() => onDeny(p.id)}
                    >
                      Deny
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
