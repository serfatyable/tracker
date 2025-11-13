'use client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StationAssignment, StationKey } from '@/types/onCall';
import { useOnCallByDate } from '../../lib/hooks/useOnCallByDate';
import { TIMELINE_DAYS_COUNT } from '../../lib/on-call/constants';
import { getStationColors } from '../../lib/on-call/stationColors';
import { stationKeys, stationI18nKeys } from '../../lib/on-call/stations';
import { createSynonymMatcher } from '../../lib/search/synonyms';
import { addDays, toDateKey } from '../../lib/utils/dateUtils';
import { Skeleton } from '../dashboard/Skeleton';

function DayCard({
  dateKey,
  filterStation,
  filterDoctor,
}: {
  dateKey: string;
  filterStation: string;
  filterDoctor: string;
}) {
  const { t } = useTranslation();
  const { data, loading } = useOnCallByDate(dateKey);
  const doctorMatcher = createSynonymMatcher(filterDoctor);
  const hasDoctorFilter = filterDoctor.trim().length > 0;

  return (
    <div className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]">
      <div className="text-xs opacity-70 font-mono mb-2">{dateKey}</div>
      {loading ? (
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : !data ? (
        <div className="text-xs opacity-60">{t('onCall.noShifts')}</div>
      ) : (
        <div className="mt-2 space-y-1">
          {stationKeys.map((sk) => {
            const entry: StationAssignment | undefined = data.stations[sk];
            if (!entry) return null;
            if (filterStation && sk !== filterStation) return null;
            if (hasDoctorFilter && !doctorMatcher(entry.userDisplayName)) return null;
            const colors = getStationColors(sk);
            return (
              <div key={sk} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${colors.bg} ${colors.border} border`} />
                  <div className="opacity-70">{t(stationI18nKeys[sk])}</div>
                </div>
                <div className="font-medium">{entry.userDisplayName}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function MiniCalendar() {
  const { t } = useTranslation();
  const [start, setStart] = useState<Date>(() => new Date());
  const [filterStation, setFilterStation] = useState<string>('');
  const [filterDoctor, setFilterDoctor] = useState<string>('');

  const days = useMemo(() => Array.from({ length: TIMELINE_DAYS_COUNT }).map((_, i) => addDays(start, i)), [start]);
  const dayKeys = days.map((d) => toDateKey(d));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={toDateKey(start)}
          onChange={(e) => setStart(new Date(e.target.value))}
          aria-label={t('onCall.filters.startDate', { defaultValue: 'Start date' })}
        />
        <select
          className="border rounded px-2 py-1 text-sm"
          value={filterStation}
          onChange={(e) => setFilterStation(e.target.value)}
          aria-label={t('onCall.filters.byStation', { defaultValue: 'Filter by station' })}
        >
          <option value="">{t('onCall.filters.byStation')}</option>
          {stationKeys.map((sk) => (
            <option key={sk} value={sk}>
              {t(stationI18nKeys[sk])}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="border rounded px-2 py-1 text-sm"
          placeholder={t('onCall.filters.byDoctor') as string}
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
          aria-label={t('onCall.filters.byDoctor', { defaultValue: 'Filter by doctor name' })}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {dayKeys.map((key) => (
          <DayCard
            key={key}
            dateKey={key}
            filterStation={filterStation}
            filterDoctor={filterDoctor}
          />
        ))}
      </div>
    </div>
  );
}
