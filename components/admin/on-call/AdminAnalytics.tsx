'use client';

import { useTranslation } from 'react-i18next';

interface AdminAnalyticsProps {
  stats: {
    residentShiftCounts: Record<string, number>;
    weekendShifts: Record<string, number>;
  };
}

/**
 * Admin Analytics Component
 * Displays shift distribution analytics including:
 * - Shifts per resident (bar chart)
 * - Weekend shift distribution (grid)
 */
export default function AdminAnalytics({ stats }: AdminAnalyticsProps) {
  const { t } = useTranslation();
  const maxShifts = Math.max(...Object.values(stats.residentShiftCounts as Record<string, number>));

  return (
    <div className="space-y-4">
      {/* Shifts per Resident Bar Chart */}
      <div className="card-levitate p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span>📊</span>
          {t('onCall.shiftsPerResident', { defaultValue: 'Shifts per Resident' })}
        </h3>
        <div className="space-y-2">
          <div className="overflow-x-container">
            <div className="inline-block min-w-[56rem] align-top">
              {Object.entries(stats.residentShiftCounts as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([resident, count]) => (
                  <div key={resident} className="flex items-center gap-3">
                    <div
                      className="w-32 text-sm text-gray-700 dark:text-[rgb(var(--fg))] truncate"
                      title={resident}
                    >
                      {resident}
                    </div>
                    <div className="flex-1 relative">
                      <div className="h-8 bg-gray-200 dark:bg-[rgb(var(--surface-depressed))] rounded-lg overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 flex items-center justify-end px-2"
                          style={{ width: `${(count / maxShifts) * 100}%` }}
                        >
                          <span className="text-xs font-bold text-white">{count}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekend Distribution */}
      <div className="card-levitate p-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <span>🌅</span>
          {t('onCall.weekendDistribution', { defaultValue: 'Weekend Shifts' })}
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(stats.weekendShifts as Record<string, number>)
            .sort((a, b) => b[1] - a[1])
            .map(([resident, count]) => (
              <div
                key={resident}
                className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-700"
              >
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate" title={resident}>
                  {resident}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
