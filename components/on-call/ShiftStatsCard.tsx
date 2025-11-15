'use client';
import { useTranslation } from 'react-i18next';

import { useOnCallFutureByUser } from '../../lib/hooks/useOnCallFutureByUser';
import { useOnCallStats } from '../../lib/hooks/useOnCallStats';
import { getStationColors } from '../../lib/on-call/stationColors';
import { stationI18nKeys } from '../../lib/on-call/stations';
import { Skeleton } from '../dashboard/Skeleton';
import Card from '../ui/Card';

import type { StationKey } from '@/types/onCall';

export default function ShiftStatsCard({ userId }: { userId?: string }) {
  const { t } = useTranslation();
  const { shifts, loading } = useOnCallFutureByUser(userId);
  const stats = useOnCallStats(shifts);

  if (!userId) return null;

  if (loading) {
    return (
      <Card className="p-4">
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (stats.totalShifts === 0) {
    return null; // Don't show stats if there are no shifts
  }

  const stationColors = stats.mostCommonStation
    ? getStationColors(stats.mostCommonStation as StationKey)
    : null;

  return (
    <Card className="p-4">
      <div className="text-sm font-medium mb-3">
        {t('onCall.statistics', { defaultValue: 'Statistics' })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-3">
          <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
            {stats.totalShifts}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-300">
            {t('onCall.totalShifts', { defaultValue: 'Total Shifts' })}
          </div>
        </div>
        {stats.mostCommonStation && stationColors && (
          <div className={`rounded-lg ${stationColors.bg} p-3`}>
            <div className={`text-sm font-semibold ${stationColors.text} truncate`}>
              {t(stationI18nKeys[stats.mostCommonStation as StationKey])}
            </div>
            <div className={`text-xs ${stationColors.text} opacity-70`}>
              {t('onCall.mostCommon', { defaultValue: 'Most Common' })} (
              {stats.stationCounts[stats.mostCommonStation]})
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
