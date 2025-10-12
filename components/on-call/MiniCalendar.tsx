'use client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnCallByDate } from '../../lib/hooks/useOnCallByDate';
import { stationKeys, stationI18nKeys } from '../../lib/on-call/stations';

function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export default function MiniCalendar() {
  const { t } = useTranslation();
  const [start, setStart] = useState<Date>(() => new Date());
  const [filterStation, setFilterStation] = useState<string>('');
  const [filterDoctor, setFilterDoctor] = useState<string>('');

  const days = useMemo(() => Array.from({ length: 21 }).map((_, i) => addDays(start, i)), [start]);
  const dayKeys = days.map((d) => toDateKey(d));
  const results = dayKeys.map((k) => ({ key: k, hook: useOnCallByDate(k) }));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <input
          type="date"
          className="border rounded px-2 py-1 text-sm"
          value={toDateKey(start)}
          onChange={(e) => setStart(new Date(e.target.value))}
        />
        <select className="border rounded px-2 py-1 text-sm" value={filterStation} onChange={(e) => setFilterStation(e.target.value)}>
          <option value="">{t('onCall.filters.byStation')}</option>
          {stationKeys.map((sk) => (
            <option key={sk} value={sk}>
              {t(stationI18nKeys[sk])}
            </option>
          ))}
        </select>
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder={t('onCall.filters.byDoctor') as string}
          value={filterDoctor}
          onChange={(e) => setFilterDoctor(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {results.map(({ key, hook }) => {
          const { data, loading } = hook;
          return (
            <div key={key} className="rounded border p-3 border-gray-200 dark:border-gray-800">
              <div className="text-xs opacity-70 font-mono">{key}</div>
              {loading || !data ? (
                <div className="text-xs opacity-60">{loading ? '…' : t('onCall.noShifts')}</div>
              ) : (
                <div className="mt-2 space-y-1">
                  {stationKeys.map((sk) => {
                    const entry = (data.stations as any)[sk];
                    if (!entry) return null;
                    if (filterStation && sk !== filterStation) return null;
                    if (filterDoctor && !String(entry.userDisplayName).toLowerCase().includes(filterDoctor.toLowerCase())) return null;
                    return (
                      <div key={sk} className="flex items-center justify-between gap-2 text-sm">
                        <div className="opacity-70">{t(stationI18nKeys[sk])}</div>
                        <div className="font-medium">{entry.userDisplayName}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


