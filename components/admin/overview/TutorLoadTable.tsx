'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';
import Button from '../../ui/Button';

type Props = {
  assignments: Assignment[];
  tutors: UserProfile[];
};

export default function TutorLoadTable({ assignments, tutors }: Props) {
  const { t } = useTranslation();
  const rows = useMemo(() => {
    const load = new Map<string, number>();
    for (const t of tutors) load.set(t.uid, 0);
    for (const a of assignments)
      for (const tid of a.tutorIds || []) load.set(tid, (load.get(tid) || 0) + 1);
    return tutors
      .map((t) => ({ tutor: t, count: load.get(t.uid) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [assignments, tutors]);

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('overview.tutorLoad')}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left opacity-70">
              <th className="py-1 pr-4">{t('overview.tutor')}</th>
              <th className="py-1 pr-4">{t('tutor.tabs.residents')}</th>
              <th className="py-1" />
            </tr>
          </thead>
          <tbody>
            {rows.map(({ tutor, count }) => (
              <tr key={tutor.uid} className="border-t border-gray-200/20">
                <td className="py-1 pr-4">{tutor.fullName || tutor.uid}</td>
                <td className="py-1 pr-4">{count}</td>
                <td className="py-1">
                  <Button size="sm" className="btn-levitate" variant="outline">
                    Assign resident
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
