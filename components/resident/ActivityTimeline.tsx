'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useUserTasks } from '@/lib/hooks/useUserTasks';
import { ListSkeleton } from '@/components/dashboard/Skeleton';

export default function ActivityTimeline() {
  const { t } = useTranslation();
  const { tasks, loading } = useUserTasks();

  const { heatmapData, recentActivities, activityStats } = useMemo(() => {
    // Generate last 12 weeks of data
    const weeks = 12;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - weeks * 7);

    // Create a map of date -> activity count
    const activityMap = new Map<string, { count: number; categories: Set<string> }>();

    tasks.forEach((task) => {
      const taskTime = (task.createdAt as any)?.toMillis?.() || 0;
      if (!taskTime) return;

      const taskDate = new Date(taskTime);
      const dateKey = taskDate.toISOString().split('T')[0] as string;
      if (!dateKey) return;

      if (!activityMap.has(dateKey)) {
        activityMap.set(dateKey, { count: 0, categories: new Set() });
      }

      const entry = activityMap.get(dateKey)!;
      entry.count += Number(task.count) || 1;
      // We could track categories here if we had that data
    });

    // Generate heatmap grid (7 rows for days of week, multiple columns for weeks)
    const heatmapData: Array<{ date: Date; count: number; level: number }> = [];
    const daysToShow = weeks * 7;

    for (let i = daysToShow - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const dateKey = date.toISOString().split('T')[0] as string;
      const count = activityMap.get(dateKey)?.count || 0;

      // Determine intensity level (0-4)
      let level = 0;
      if (count > 0) level = 1;
      if (count >= 3) level = 2;
      if (count >= 6) level = 3;
      if (count >= 10) level = 4;

      heatmapData.push({ date, count, level });
    }

    // Get recent activities (last 5 unique tasks)
    const sortedTasks = [...tasks]
      .sort((a, b) => {
        const aTime = (a.createdAt as any)?.toMillis?.() || 0;
        const bTime = (b.createdAt as any)?.toMillis?.() || 0;
        return bTime - aTime;
      })
      .slice(0, 5);

    const recentActivities = sortedTasks.map((task) => ({
      id: task.id,
      itemId: task.itemId,
      count: task.count,
      status: task.status,
      createdAt: task.createdAt,
    }));

    // Calculate activity stats
    const totalActivities = tasks.length;
    const thisWeekCount = tasks.filter((t) => {
      const taskTime = (t.createdAt as any)?.toMillis?.() || 0;
      return taskTime >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
    }).length;

    const activityStats = {
      total: totalActivities,
      thisWeek: thisWeekCount,
      mostActiveDay: getMostActiveDay(activityMap),
    };

    return { heatmapData, recentActivities, activityStats };
  }, [tasks]);

  function getMostActiveDay(
    activityMap: Map<string, { count: number; categories: Set<string> }>,
  ): string {
    let maxCount = 0;
    let maxDate = '';

    activityMap.forEach((value, key) => {
      if (value.count > maxCount) {
        maxCount = value.count;
        maxDate = key;
      }
    });

    return maxDate
      ? new Date(maxDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : '-';
  }

  function getIntensityColor(level: number): string {
    const colors: readonly string[] = [
      'bg-gray-100 dark:bg-gray-800', // 0: no activity
      'bg-teal-200 dark:bg-teal-900/40', // 1: low
      'bg-teal-400 dark:bg-teal-700/60', // 2: medium
      'bg-teal-600 dark:bg-teal-600/80', // 3: high
      'bg-teal-800 dark:bg-teal-500', // 4: very high
    ];
    const clampedLevel = Math.max(0, Math.min(level, colors.length - 1));
    return colors[clampedLevel] as string;
  }

  if (loading) {
    return (
      <div className="card-levitate rounded-xl border p-5">
        <ListSkeleton items={3} />
      </div>
    );
  }

  // Group by weeks for display
  const weeks: typeof heatmapData[] = [];
  for (let i = 0; i < heatmapData.length; i += 7) {
    weeks.push(heatmapData.slice(i, i + 7));
  }

  return (
    <div className="card-levitate overflow-hidden rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm dark:border-gray-700/40 dark:bg-gray-900/50">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          📈 {t('ui.home.activityTimeline', { defaultValue: 'Activity Timeline' })}
        </h3>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span>{t('ui.home.less', { defaultValue: 'Less' })}</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`h-3 w-3 rounded-sm ${getIntensityColor(level)}`} />
            ))}
          </div>
          <span>{t('ui.home.more', { defaultValue: 'More' })}</span>
        </div>
      </div>

      {/* Activity Stats */}
      <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
        <div className="text-center">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {activityStats.total}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t('ui.home.totalActivities', { defaultValue: 'Total' })}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {activityStats.thisWeek}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t('ui.home.thisWeek', { defaultValue: 'This Week' })}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-teal-600 dark:text-teal-400">
            {activityStats.mostActiveDay}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t('ui.home.mostActive', { defaultValue: 'Most Active' })}
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="mb-4 overflow-x-auto">
        <div className="inline-flex gap-1">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => {
                const isToday =
                  day.date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={dayIndex}
                    className={`group relative h-3 w-3 rounded-sm ${getIntensityColor(day.level)} ${
                      isToday ? 'ring-2 ring-sky-500 ring-offset-1' : ''
                    } transition-all hover:scale-125`}
                    title={`${day.date.toLocaleDateString()}: ${day.count} ${day.count === 1 ? 'activity' : 'activities'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Day labels */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
        <span>{t('ui.home.last12Weeks', { defaultValue: 'Last 12 weeks' })}</span>
      </div>
    </div>
  );
}
