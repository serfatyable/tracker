'use client';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useOnCallFutureByUser } from '../../lib/hooks/useOnCallFutureByUser';
import { stationI18nKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';
import Card from '../ui/Card';

export default function MyShiftsList({
  userId,
  daysAhead = 40,
}: {
  userId?: string;
  daysAhead?: number;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { shifts, loading } = useOnCallFutureByUser(userId, daysAhead);

  const handleDownload = useCallback(() => {
    try {
      const link = document.createElement('a');
      link.href = '/api/ics/on-call?personal=true';
      link.rel = 'nofollow';
      link.download = 'my-shifts.ics';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      router.push('/api/ics/on-call?personal=true');
    }
  }, [router]);

  const grouped = useMemo(() => {
    const map = new Map<string, { date: Date; items: { stationKey: string }[] }>();
    for (const s of shifts) {
      const bucket = map.get(s.dateKey) || { date: s.date, items: [] };
      bucket.items.push({ stationKey: s.stationKey });
      map.set(s.dateKey, bucket);
    }
    return Array.from(map.entries()).map(([dateKey, { date, items }]) => ({
      dateKey,
      date,
      items,
    }));
  }, [shifts]);

  if (!userId) return null;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          {t('onCall.myShifts', { defaultValue: 'My Shifts' })}
        </div>
        <button
          type="button"
          onClick={handleDownload}
          className="pill text-xs"
          aria-label={t('onCall.downloadMyCalendar', { defaultValue: 'Download My Calendar' })}
        >
          {t('onCall.downloadMyCalendar', { defaultValue: 'Download My Calendar' })}
        </button>
      </div>

      {loading ? (
        <div className="text-sm opacity-70">{t('ui.loading', { defaultValue: 'Loading…' })}</div>
      ) : grouped.length === 0 ? (
        <div className="text-sm opacity-70">
          {t('onCall.emptyMyShifts', { defaultValue: 'nothing in here' })}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map((g) => (
            <button
              key={g.dateKey}
              className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))] text-left w-full hover:bg-gray-50 dark:hover:bg-white/5"
              onClick={() => router.push(`/on-call?tab=team&date=${g.dateKey}`)}
            >
              <div className="text-xs opacity-70">{new Date(g.date).toLocaleDateString()}</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {g.items.map((it, idx) => (
                  <span key={idx} className="pill text-xs">
                    {t(stationI18nKeys[it.stationKey as StationKey])}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </Card>
  );
}
