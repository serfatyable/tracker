'use client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { assignTutorToResident, unassignTutorFromResident } from '../../lib/firebase/admin';
import type { Assignment } from '../../types/assignments';
import type { UserProfile } from '../../types/auth';
import type { Rotation } from '../../types/rotations';
import Button from '../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../ui/Dialog';

type Props = {
  meUid: string;
  assignments: Assignment[];
  rotations: Rotation[];
  residents: UserProfile[];
  tutors: UserProfile[];
  ownedRotationIds: Set<string>;
};

export default function AssignedResidents({
  meUid,
  assignments,
  rotations,
  residents,
  tutors: _tutors,
  ownedRotationIds,
}: Props) {
  const { t } = useTranslation();
  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const rotById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);
  const mine = useMemo(
    () => assignments.filter((a) => (a.tutorIds || []).includes(meUid)),
    [assignments, meUid],
  );

  const [assignState, setAssignState] = useState<{ residentId: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const canSelfAssign = (rotationId: string) => ownedRotationIds.has(rotationId);

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('tutor.assignedResidents')}</div>
      <div className="space-y-2">
        {mine.map((a) => {
          const resident = resById.get(a.residentId);
          const rotation = rotById.get(a.rotationId);
          if (!resident || !rotation) return null;
          const isOnOwnedRotation = canSelfAssign(rotation.id);
          const hasMe = (a.tutorIds || []).includes(meUid);
          return (
            <div
              key={a.id}
              className="border rounded p-2 flex items-center justify-between text-sm"
            >
              <div className="flex flex-col">
                <span className="font-medium">{resident.fullName || resident.uid}</span>
                <span className="opacity-70 text-xs">{rotation.name}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="btn-levitate"
                  variant="outline"
                  onClick={() => window.open(`/residents/${resident.uid}`, '_self')}
                >
                  Open profile
                </Button>
                {isOnOwnedRotation && !hasMe ? (
                  <Button
                    size="sm"
                    className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                    disabled={busy === a.id}
                    onClick={async () => {
                      setBusy(a.id);
                      try {
                        await assignTutorToResident(resident.uid, meUid);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Self-assign
                  </Button>
                ) : null}
                {isOnOwnedRotation && hasMe ? (
                  <Button
                    size="sm"
                    className="btn-levitate border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    variant="outline"
                    disabled={busy === a.id}
                    onClick={async () => {
                      setBusy(a.id);
                      try {
                        await unassignTutorFromResident(resident.uid, meUid);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    Unassign
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!assignState} onClose={() => setAssignState(null)}>
        <div className="p-3 space-y-2">
          <DialogHeader>{t('tutor.assign')}</DialogHeader>
          <div className="text-sm">{t('tutor.featureNotUsed')}</div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAssignState(null)}>
              Close
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
