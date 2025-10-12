'use client';
import { useTranslation } from 'react-i18next';
import { useOnCallUpcomingByUser } from '../../lib/hooks/useOnCallUpcomingByUser';
import { stationI18nKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';

export default function NextShiftCard({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const { next, loading } = useOnCallUpcomingByUser(userId);

  if (!userId) return null;
  if (loading) return <div className="text-sm opacity-60">Loading…</div>;
  if (!next) return <div className="text-sm opacity-60">{t('onCall.noShifts')}</div>;

  const start = new Date((next.startAt as any).seconds ? (next.startAt as any).seconds * 1000 : (next as any).startAt);
  const dateStr = start.toLocaleDateString();
  const stationLabel = t(stationI18nKeys[next.stationKey as StationKey]);

  return (
    <div className="rounded border p-3 border-gray-200 dark:border-gray-800">
      <div className="text-xs opacity-70">{t('onCall.yourNextShift')}</div>
      <div className="mt-1 text-sm">
        {dateStr} — {stationLabel}
      </div>
    </div>
  );
}


