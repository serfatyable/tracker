'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { assignResidentToRotation } from '../../../lib/firebase/admin';
import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';
import Button from '../../ui/Button';

type Props = {
  assignments: Assignment[];
  residents: UserProfile[];
  rotations: { id: string; name: string }[];
};

export default function UnassignedQueues({ assignments, residents, rotations }: Props) {
  const { t } = useTranslation();
  const { unassignedResidents } = useMemo(() => {
    const assigned = new Set(assignments.map((a) => a.residentId));
    return {
      unassignedResidents: residents.filter((r) => r.role === 'resident' && !assigned.has(r.uid)),
    };
  }, [assignments, residents]);

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('overview.unassigned')}</div>
      <div className="space-y-2">
        {unassignedResidents.length === 0 ? (
          <div className="text-sm opacity-70">{t('overview.allResidentsAssigned')}</div>
        ) : (
          unassignedResidents.map((r) => (
            <div
              key={r.uid}
              className="flex items-center justify-between border rounded p-2 hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] transition"
            >
              <div className="text-sm">{r.fullName || r.uid}</div>
              <div className="flex items-center gap-2">
                {rotations.map((rot) => (
                  <Button
                    key={rot.id}
                    size="sm"
                    className="btn-levitate"
                    variant="outline"
                    onClick={() => assignResidentToRotation(r.uid, rot.id)}
                  >
                    {rot.name}
                  </Button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
