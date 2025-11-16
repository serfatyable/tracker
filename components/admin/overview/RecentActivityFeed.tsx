'use client';

import {
  ClockIcon,
  UserPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import type { AuditLogEntry } from '../../../lib/hooks/useRecentActivity';

type Props = {
  activities: AuditLogEntry[];
};

export default function RecentActivityFeed({ activities }: Props): React.ReactElement {
  const { t, i18n } = useTranslation();

  const getActivityIcon = (action: string) => {
    if (action?.includes('approve') || action?.includes('accept')) return CheckCircleIcon;
    if (action?.includes('deny') || action?.includes('reject')) return XCircleIcon;
    if (action?.includes('assign') || action?.includes('create')) return UserPlusIcon;
    if (action?.includes('update') || action?.includes('change')) return ArrowPathIcon;
    return ClockIcon;
  };

  const getActivityColor = (action: string) => {
    if (action?.includes('approve') || action?.includes('accept'))
      return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
    if (action?.includes('deny') || action?.includes('reject'))
      return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
    if (action?.includes('assign') || action?.includes('create'))
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
    return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('dashboard.justNow', { defaultValue: 'Just now' });
    if (diffMins < 60)
      return t('dashboard.minutesAgo', { count: diffMins, defaultValue: `${diffMins}m ago` });
    if (diffHours < 24)
      return t('dashboard.hoursAgo', { count: diffHours, defaultValue: `${diffHours}h ago` });
    return t('dashboard.daysAgo', { count: diffDays, defaultValue: `${diffDays}d ago` });
  };

  if (activities.length === 0) {
    return (
      <div className="card-levitate p-6 text-center">
        <ClockIcon className="h-12 w-12 mx-auto text-foreground/30 mb-3" />
        <p className="text-sm text-foreground/60">
          {t('dashboard.noRecentActivity', { defaultValue: 'No recent activity' })}
        </p>
      </div>
    );
  }

  return (
    <div className="card-levitate p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        {t('dashboard.recentActivity', { defaultValue: 'Recent Activity' })}
      </h3>
      <p className="text-sm text-foreground/60 mb-4">
        {t('dashboard.recentActivityDesc', {
          defaultValue: 'Latest system events and actions',
        })}
      </p>

      <div className="space-y-3">
        {activities.map((activity, index) => {
          const Icon = getActivityIcon(activity.action || '');
          const colorClass = getActivityColor(activity.action || '');

          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors"
            >
              <div className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground">
                  {activity.userName || t('dashboard.system', { defaultValue: 'System' })}
                </div>
                <div className="text-sm text-foreground/70 mt-0.5">
                  {activity.action || t('dashboard.performedAction', { defaultValue: 'Performed an action' })}
                </div>
                {activity.details && (
                  <div className="text-xs text-foreground/50 mt-1 line-clamp-1">
                    {activity.details}
                  </div>
                )}
              </div>
              <div className="text-xs text-foreground/50 whitespace-nowrap">
                {formatTimeAgo(activity.timestamp)}
              </div>
            </div>
          );
        })}
      </div>

      {activities.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800 text-center">
          <p className="text-xs text-foreground/60">
            {t('dashboard.showing', { defaultValue: 'Showing' })} {activities.length}{' '}
            {t('dashboard.recentEvents', { defaultValue: 'recent events' })}
          </p>
        </div>
      )}
    </div>
  );
}
