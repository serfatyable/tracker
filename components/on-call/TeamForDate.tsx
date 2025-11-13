'use client';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StationAssignment, StationKey } from '@/types/onCall';
import { useOnCallByDate } from '../../lib/hooks/useOnCallByDate';
import { stationI18nKeys, stationKeys } from '../../lib/on-call/stations';
import { toDateKey } from '../../lib/utils/dateUtils';
import { Skeleton } from '../dashboard/Skeleton';
import EmptyState, { CalendarIcon } from '../ui/EmptyState';

export default function TeamForDate({ initialDateKey }: { initialDateKey?: string }) {
  const { t } = useTranslation();
  const [dateKey, setDateKey] = useState<string>(() => initialDateKey || toDateKey(new Date()));
  const { data, loading } = useOnCallByDate(dateKey);

  useEffect(() => {
    if (initialDateKey) setDateKey(initialDateKey);
  }, [initialDateKey]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
          aria-label={t('onCall.selectDate', { defaultValue: 'Select date to view team' })}
        />
        <div className="text-xs opacity-70">
          {t('onCall.teamOnDate', { defaultValue: 'Team for' })}: {dateKey}
        </div>
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]"
            >
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </div>
      ) : !data ? (
        <EmptyState
          icon={<CalendarIcon size={40} />}
          title={t('onCall.noShiftsDate', { defaultValue: 'No shifts for this date' })}
          description={t('onCall.noShiftsDateDesc', {
            defaultValue: 'Try selecting a different date to view on-call assignments.',
          })}
          className="py-6"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stationKeys.map((sk) => {
            const entry: StationAssignment | undefined = data.stations[sk];
            if (!entry) return null;
            return (
              <div
                key={sk}
                className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]"
              >
                <div className="text-xs opacity-70">{t(stationI18nKeys[sk])}</div>
                <div className="mt-1 font-medium">{entry.userDisplayName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
