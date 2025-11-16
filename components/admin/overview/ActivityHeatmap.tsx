'use client';

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { AuditLogEntry } from '../../../lib/hooks/useRecentActivity';

type Props = {
  activities: AuditLogEntry[];
};

export default function ActivityHeatmap({ activities }: Props): React.ReactElement {
  const { t, i18n } = useTranslation();

  const heatmapData = useMemo(() => {
    // Get last 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      days.push(date);
    }

    // Count activities per day
    const activityCounts = new Map<string, number>();
    for (const activity of activities) {
      if (!activity.timestamp) continue;
      const activityDate = activity.timestamp.toDate();
      activityDate.setHours(0, 0, 0, 0);
      const dateKey = activityDate.toISOString().split('T')[0] as string;
      activityCounts.set(dateKey, (activityCounts.get(dateKey) || 0) + 1);
    }

    // Find max for scaling
    const maxCount = Math.max(...Array.from(activityCounts.values()), 1);

    return days.map((date) => {
      const dateKey = date.toISOString().split('T')[0] as string;
      const count = activityCounts.get(dateKey) || 0;
      const intensity = maxCount > 0 ? count / maxCount : 0;

      const lang = i18n.language || 'en';
      return {
        date,
        dateKey,
        count,
        intensity,
        dayName: new Intl.DateTimeFormat(lang === 'he' ? 'he-IL' : 'en-US', {
          weekday: 'short',
        }).format(date),
        dayNumber: date.getDate(),
      };
    });
  }, [activities, i18n.language]);

  const getHeatColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
    if (intensity < 0.25) return 'bg-green-200 dark:bg-green-900/40';
    if (intensity < 0.5) return 'bg-green-400 dark:bg-green-700/60';
    if (intensity < 0.75) return 'bg-green-500 dark:bg-green-600/70';
    return 'bg-green-600 dark:bg-green-500/80';
  };

  return (
    <div className="card-levitate p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('dashboard.weeklyActivity', { defaultValue: 'Weekly Activity' })}
      </h3>
      <p className="text-sm text-foreground/60 mb-4">
        {t('dashboard.weeklyActivityDesc', {
          defaultValue: 'System activity over the past 7 days',
        })}
      </p>

      <div className="grid grid-cols-7 gap-3">
        {heatmapData.map((day) => (
          <div key={day.dateKey} className="flex flex-col items-center">
            <div className="text-xs font-medium text-foreground/70 mb-2">{day.dayName}</div>
            <div
              className={`w-full aspect-square rounded-lg ${getHeatColor(day.intensity)} transition-all duration-200 hover:scale-110 hover:shadow-md flex items-center justify-center cursor-pointer group relative`}
              title={`${day.count} ${t('dashboard.activities', { defaultValue: 'activities' })}`}
            >
              <span className="text-xs font-semibold text-foreground/80 dark:text-white/80">
                {day.dayNumber}
              </span>
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs py-1 px-2 rounded shadow-lg whitespace-nowrap">
                  {day.count} {t('dashboard.activities', { defaultValue: 'activities' })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 flex items-center justify-center gap-2 text-xs text-foreground/60">
        <span>{t('dashboard.less', { defaultValue: 'Less' })}</span>
        <div className="flex gap-1">
          <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800" />
          <div className="w-4 h-4 rounded bg-green-200 dark:bg-green-900/40" />
          <div className="w-4 h-4 rounded bg-green-400 dark:bg-green-700/60" />
          <div className="w-4 h-4 rounded bg-green-500 dark:bg-green-600/70" />
          <div className="w-4 h-4 rounded bg-green-600 dark:bg-green-500/80" />
        </div>
        <span>{t('dashboard.more', { defaultValue: 'More' })}</span>
      </div>
    </div>
  );
}
