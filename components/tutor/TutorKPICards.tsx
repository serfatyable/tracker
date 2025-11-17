'use client';

import {
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

type KPIMetric = {
  id: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'teal' | 'sky' | 'emerald' | 'violet' | 'amber';
};

type Props = {
  pendingApprovals: number;
  assignedResidents: number;
  avgResponseTime: string;
  completionRate: number;
  teachingLoad: number;
};

export default function TutorKPICards({
  pendingApprovals,
  assignedResidents,
  avgResponseTime,
  completionRate,
  teachingLoad,
}: Props) {
  const { t } = useTranslation();

  const metrics: KPIMetric[] = [
    {
      id: 'pending',
      label: t('tutor.kpi.pendingApprovals'),
      value: pendingApprovals,
      icon: ClockIcon,
      color: 'amber',
      trend: pendingApprovals > 10 ? 'up' : 'neutral',
    },
    {
      id: 'residents',
      label: t('tutor.kpi.assignedResidents'),
      value: assignedResidents,
      icon: UserGroupIcon,
      color: 'sky',
    },
    {
      id: 'response',
      label: t('tutor.kpi.avgResponseTime'),
      value: avgResponseTime,
      icon: ChartBarIcon,
      color: 'teal',
    },
    {
      id: 'completion',
      label: t('tutor.kpi.completionRate'),
      value: `${completionRate}%`,
      icon: CheckCircleIcon,
      color: 'emerald',
      trend: completionRate > 70 ? 'up' : completionRate < 50 ? 'down' : 'neutral',
      trendValue: completionRate > 70 ? t('tutor.kpi.excellent') : '',
    },
    {
      id: 'load',
      label: t('tutor.kpi.teachingLoad'),
      value: teachingLoad,
      icon: UserGroupIcon,
      color: 'violet',
    },
  ];

  const colorClasses = {
    teal: {
      bg: 'bg-gradient-to-br from-teal-500/10 via-cyan-500/5 to-sky-500/10 dark:from-teal-500/15 dark:via-cyan-500/10 dark:to-sky-500/15',
      ring: 'ring-teal-400/25 dark:ring-teal-400/30',
      iconBg: 'bg-gradient-to-br from-teal-500 to-cyan-500',
      text: 'text-teal-900 dark:text-teal-50',
      label: 'text-teal-700 dark:text-teal-300',
    },
    sky: {
      bg: 'bg-gradient-to-br from-sky-500/10 via-indigo-500/5 to-sky-400/10 dark:from-sky-500/15 dark:via-indigo-500/10 dark:to-sky-400/15',
      ring: 'ring-sky-400/25 dark:ring-sky-400/30',
      iconBg: 'bg-gradient-to-br from-sky-500 to-indigo-500',
      text: 'text-sky-900 dark:text-sky-50',
      label: 'text-sky-700 dark:text-sky-300',
    },
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-emerald-400/10 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-emerald-400/15',
      ring: 'ring-emerald-400/25 dark:ring-emerald-400/30',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-500',
      text: 'text-emerald-900 dark:text-emerald-50',
      label: 'text-emerald-700 dark:text-emerald-300',
    },
    violet: {
      bg: 'bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-indigo-500/10 dark:from-violet-500/15 dark:via-fuchsia-500/10 dark:to-indigo-500/15',
      ring: 'ring-violet-400/25 dark:ring-violet-400/30',
      iconBg: 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
      text: 'text-violet-900 dark:text-violet-50',
      label: 'text-violet-700 dark:text-violet-300',
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-yellow-500/10 dark:from-amber-500/15 dark:via-orange-500/10 dark:to-yellow-500/15',
      ring: 'ring-amber-400/25 dark:ring-amber-400/30',
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-500',
      text: 'text-amber-900 dark:text-amber-50',
      label: 'text-amber-700 dark:text-amber-300',
    },
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => {
        const colors = colorClasses[metric.color];
        const Icon = metric.icon;

        return (
          <div
            key={metric.id}
            className={`group relative overflow-hidden rounded-xl ${colors.bg} p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(0,0,0,0.05)] ring-1 ${colors.ring} transition-all duration-300 hover:scale-105 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_12px_24px_-8px_rgba(0,0,0,0.15)]`}
          >
            {/* Icon */}
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg ${colors.iconBg} shadow-lg`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>

            {/* Label */}
            <div className={`text-xs font-medium uppercase tracking-wide ${colors.label}`}>
              {metric.label}
            </div>

            {/* Value */}
            <div className={`mt-2 text-2xl font-bold ${colors.text}`}>{metric.value}</div>

            {/* Trend */}
            {metric.trend && (
              <div className="mt-2 flex items-center gap-1">
                {metric.trend === 'up' && (
                  <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                )}
                {metric.trend === 'down' && (
                  <ArrowTrendingDownIcon className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                )}
                {metric.trendValue && (
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {metric.trendValue}
                  </span>
                )}
              </div>
            )}

            {/* Hover effect decoration */}
            <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/5 transition-transform duration-300 group-hover:scale-150" />
          </div>
        );
      })}
    </div>
  );
}
