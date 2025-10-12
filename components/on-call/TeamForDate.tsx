'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnCallByDate } from '../../lib/hooks/useOnCallByDate';
import { stationI18nKeys, stationKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';

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
        <div className="text-sm opacity-60">Loading…</div>
      ) : !data ? (
        <div className="text-sm opacity-60">{t('onCall.noShifts')}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stationKeys.map((sk) => {
            const entry = (data.stations as any)[sk] as { userId: string; userDisplayName: string } | undefined;
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


