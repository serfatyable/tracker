'use client';

import {
  ChartBarIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

type Insight = {
  id: string;
  label: string;
  value: string | number;
  icon?: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
};

type Props = {
  fairnessScore?: number;
  mostActiveResidents?: Array<{ name: string; tasksCount: number }>;
  popularItems?: Array<{ name: string; logCount: number }>;
  weeklyApprovals?: number;
  peakActivityTime?: string;
};

export default function TutorInsightsPanel({
  fairnessScore = 85,
  mostActiveResidents = [
    { name: 'Sarah Cohen', tasksCount: 24 },
    { name: 'David Levi', tasksCount: 22 },
    { name: 'Rachel Mizrahi', tasksCount: 19 },
  ],
  popularItems = [
    { name: 'Airway Management', logCount: 45 },
    { name: 'Central Line Insertion', logCount: 38 },
    { name: 'Epidural Placement', logCount: 32 },
  ],
  weeklyApprovals = 67,
  peakActivityTime = '14:00-16:00',
}: Props) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const insights: Insight[] = [
    {
      id: 'fairness',
      label: t('tutor.insights.fairnessScore'),
      value: `${fairnessScore}%`,
      icon: TrophyIcon,
      trend: fairnessScore > 80 ? 'up' : 'down',
    },
    {
      id: 'approvals',
      label: t('tutor.insights.weeklyApprovals'),
      value: weeklyApprovals,
      icon: ChartBarIcon,
    },
    {
      id: 'peak',
      label: t('tutor.insights.peakActivity'),
      value: peakActivityTime,
      icon: ClockIcon,
    },
  ];

  return (
    <Card
      tone="slate"
      variant="tinted"
      title={
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <span>{t('tutor.insights.title')}</span>
          {isExpanded ? (
            <ChevronUpIcon className="h-5 w-5" />
          ) : (
            <ChevronDownIcon className="h-5 w-5" />
          )}
        </button>
      }
      subtitle={!isExpanded ? t('tutor.insights.subtitle') : undefined}
    >
      {!isExpanded && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div
                key={insight.id}
                className="rounded-lg bg-white/60 p-4 shadow-sm ring-1 ring-gray-200/60 backdrop-blur-sm dark:bg-slate-800/40 dark:ring-gray-700/60"
              >
                {Icon && (
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 shadow-sm">
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                )}
                <div className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                  {insight.label}
                </div>
                <div className="mt-1 text-xl font-bold text-gray-900 dark:text-gray-50">
                  {insight.value}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-6">
          {/* Quick stats grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div
                  key={insight.id}
                  className="rounded-lg bg-white/60 p-4 shadow-sm ring-1 ring-gray-200/60 backdrop-blur-sm dark:bg-slate-800/40 dark:ring-gray-700/60"
                >
                  {Icon && (
                    <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-slate-500 to-gray-600 shadow-sm">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className="text-xs font-medium uppercase tracking-wide text-gray-600 dark:text-gray-400">
                    {insight.label}
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-50">
                      {insight.value}
                    </span>
                    {insight.trend === 'up' && (
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                        {t('tutor.insights.improving')}
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Most active residents */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              <FireIcon className="h-5 w-5 text-orange-500" />
              {t('tutor.insights.mostActive')}
            </h3>
            <div className="space-y-2">
              {mostActiveResidents.map((resident, index) => (
                <div
                  key={resident.name}
                  className="flex items-center justify-between rounded-lg bg-white/60 p-3 shadow-sm ring-1 ring-gray-200/60 backdrop-blur-sm dark:bg-slate-800/40 dark:ring-gray-700/60"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-sm font-bold text-white">
                      {index + 1}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-50">
                      {resident.name}
                    </span>
                  </div>
                  <Badge variant="outline">
                    {resident.tasksCount} {t('tutor.insights.tasks')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Popular rotation items */}
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
              <ChartBarIcon className="h-5 w-5 text-teal-500" />
              {t('tutor.insights.popularItems')}
            </h3>
            <div className="space-y-2">
              {popularItems.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between rounded-lg bg-white/60 p-3 shadow-sm ring-1 ring-gray-200/60 backdrop-blur-sm dark:bg-slate-800/40 dark:ring-gray-700/60"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-50">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-cyan-500"
                        style={{ width: `${(item.logCount / 50) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                      {item.logCount}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Completion trends - Simple bar chart representation */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-50">
              {t('tutor.insights.weeklyTrend')}
            </h3>
            <div className="flex items-end justify-between gap-2">
              {[12, 18, 15, 22, 19, 25, 23].map((value, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-2">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-teal-500 to-cyan-400 transition-all hover:from-teal-600 hover:to-cyan-500"
                    style={{ height: `${value * 4}px` }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
