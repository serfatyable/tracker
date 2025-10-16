'use client';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '../../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForResident } from '../../../lib/hooks/useReflections';

export default function ResidentReflectionsIndexPage() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { list } = useReflectionsForResident(me?.uid || null);
  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-semibold">{t('resident.myReflections')}</h1>
      <div className="text-sm opacity-70">{t('resident.recentlySubmitted')}</div>
      <div className="space-y-2">
        {(list || []).map((r) => (
          <div key={r.id} className="border rounded p-2 text-sm flex items-center justify-between">
            <div>
              <div className="font-medium">{r.taskType}</div>
              <div className="text-xs opacity-70">{r.taskOccurrenceId}</div>
            </div>
            <div className="text-xs opacity-70">
              {r.submittedAt?.toDate?.()?.toLocaleString?.() || ''}
            </div>
          </div>
        ))}
        {!list?.length ? <div className="text-sm opacity-70">No reflections yet.</div> : null}
      </div>
    </div>
  );
}
