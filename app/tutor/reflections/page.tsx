'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../../components/auth/AuthGate';
import AppShell from '../../../components/layout/AppShell';
import LargeTitleHeader from '../../../components/layout/LargeTitleHeader';
import Card from '../../../components/ui/Card';
import Input from '../../../components/ui/Input';
import { useCurrentUserProfile } from '../../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForTutor } from '../../../lib/hooks/useReflections';
import { createSynonymMatcher } from '../../../lib/search/synonyms';

export default function TutorReflectionsPage() {
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [residentFilter, setResidentFilter] = useState<string>('');
  const { list, loading } = useReflectionsForTutor(me?.uid || null);
  const residentMatcher = createSynonymMatcher(residentFilter);
  const hasResidentFilter = residentFilter.trim().length > 0;

  const filtered = (list || []).filter((r) => {
    const submitted = (r as any).submittedAt?.toDate?.() as Date | undefined;
    if (from && submitted && submitted < new Date(from)) return false;
    if (to && submitted && submitted > new Date(to)) return false;
    if (hasResidentFilter && !residentMatcher((r as any).residentId)) return false;
    return true;
  });

  return (
    <AuthGate requiredRole="tutor">
      <AppShell>
        <LargeTitleHeader title={t('ui.reflections', { defaultValue: 'Reflections' }) as string} />
        <div className="app-container p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              aria-label="From"
            />
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" />
            <Input
              placeholder={t('ui.searchUsers', { defaultValue: 'Search users' }) as string}
              value={residentFilter}
              onChange={(e) => setResidentFilter(e.target.value)}
            />
          </div>
          <Card>
            <div className="font-semibold mb-2">{t('tutor.reflectionsIWrote')}</div>
            {loading ? (
              <div className="text-sm opacity-70">{t('common.loading')}</div>
            ) : (
              <div className="space-y-2">
                {filtered.map((r) => (
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
                {!loading && filtered.length === 0 ? (
                  <div className="text-sm opacity-70">{t('reflections.noSubmissionsYet')}</div>
                ) : null}
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </AuthGate>
  );
}
