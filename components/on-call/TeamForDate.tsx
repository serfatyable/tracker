'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useOnCallByDate } from '../../lib/hooks/useOnCallByDate';
import { stationI18nKeys, stationKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';
import { Skeleton } from '../dashboard/Skeleton';
import EmptyState, { CalendarIcon } from '../ui/EmptyState';

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function TeamForDate() {
  const { t } = useTranslation();
  const [dateKey, setDateKey] = useState<string>(() => toDateKey(new Date()));
  const { data, loading } = useOnCallByDate(dateKey);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={dateKey}
          onChange={(e) => setDateKey(e.target.value)}
        />
      </div>
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded border p-3 border-gray-200 dark:border-gray-800">
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
            const entry = (data.stations as any)[sk] as
              | { userId: string; userDisplayName: string }
              | undefined;
            if (!entry) return null;
            return (
              <div key={sk} className="rounded border p-3 border-gray-200 dark:border-gray-800">
                <div className="text-xs opacity-70">{t(stationI18nKeys[sk as StationKey])}</div>
                <div className="mt-1 font-medium">{entry.userDisplayName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
