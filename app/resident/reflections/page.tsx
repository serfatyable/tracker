'use client';
import { useTranslation } from 'react-i18next';

import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import Card from '../../../components/ui/Card';
import { useCurrentUserProfile } from '../../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForResident } from '../../../lib/hooks/useReflections';

export default function ResidentReflectionsIndexPage() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { list, loading } = useReflectionsForResident(me?.uid || null);
  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.reflections', { defaultValue: 'Reflections' }) as string} />
      <div className="app-container p-4 space-y-3">
        <Card>
          <div className="font-semibold mb-2">{t('resident.myReflections')}</div>
          {loading ? (
            <div className="text-sm opacity-70">{t('common.loading')}</div>
          ) : (
            <div className="space-y-2">
              {(list || []).map((r) => (
                <div
                  key={r.id}
                  className="border rounded p-2 text-sm flex items-center justify-between border-gray-200 dark:border-[rgb(var(--border))]"
                >
                  <div>
                    <div className="font-medium">{(r as any).taskType}</div>
                    <div className="text-xs opacity-70">{(r as any).taskOccurrenceId}</div>
                  </div>
                  <div className="text-xs opacity-70">
                    {(r as any).submittedAt?.toDate?.()?.toLocaleString?.() || ''}
                  </div>
                </div>
              ))}
              {!loading && !list?.length ? (
                <div className="text-sm opacity-70">{t('reflections.noSubmissionsYet')}</div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
