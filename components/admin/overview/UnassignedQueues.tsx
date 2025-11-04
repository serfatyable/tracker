'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { assignResidentToRotation } from '../../../lib/firebase/admin';
import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';
import Select from '../../ui/Select';

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
              <Select
                defaultValue=""
                disabled={rotations.length === 0}
                className="w-48 text-sm"
                aria-label={t('overview.assignRotation', { defaultValue: 'Assign to rotation' })}
                onChange={(event) => {
                  const rotationId = event.target.value;
                  if (!rotationId) return;
                  assignResidentToRotation(r.uid, rotationId);
                  event.target.value = '';
                }}
              >
                <option value="" hidden>
                  {t('overview.assignRotation', { defaultValue: 'Assign to rotation' })}
                </option>
                {rotations.map((rot) => (
                  <option key={rot.id} value={rot.id}>
                    {rot.name}
                  </option>
                ))}
              </Select>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
