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
      <div className="overflow-x-auto overflow-y-auto max-h-[60vh]">
        <div className="inline-block min-w-[40rem] sm:min-w-[56rem] align-top w-full">
          <table className="w-full table-auto text-sm md:text-base">
            <thead className="sticky top-0 bg-white dark:bg-neutral-950 z-10">
              <tr className="text-left opacity-70 text-sm md:text-base">
                <th className="py-1 pr-4 sticky left-0 z-10 bg-white dark:bg-neutral-950">
                  {t('overview.tutor')}
                </th>
                <th className="py-1 pr-4">{t('tutor.tabs.residents')}</th>
                <th className="py-1 hidden md:table-cell" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ tutor, count }) => (
                <tr key={tutor.uid} className="border-t border-gray-200/20">
                  <td className="py-1 pr-4 break-anywhere sticky left-0 z-10 bg-white dark:bg-neutral-950">
                    {tutor.fullName || tutor.uid}
                  </td>
                  <td className="py-1 pr-4 whitespace-nowrap leading-normal">{count}</td>
                  <td className="py-1 hidden md:table-cell">
                    <Button size="sm" className="btn-levitate" variant="outline">
                      {t('overview.assignResident', { defaultValue: 'Assign resident' })}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
