'use client';

import { useTranslation } from 'react-i18next';

import Badge from '../ui/Badge';

type Props = {
  rotationId: string | null;
};

export default function RotationActivity({ rotationId }: Props) {
  const { t } = useTranslation();

  // TODO: Get actual activity data from props or context
  const activities: Array<{
    id: string;
    type: 'log' | 'approval' | 'comment';
    user: string;
    item: string;
    timestamp: Date;
    details?: string;
  }> = [];

  if (!rotationId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('ui.selectRotation', { defaultValue: 'Select a rotation to view activity' })}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('ui.noActivity', { defaultValue: 'No recent activity' })}
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          {t('ui.noActivityDescription', {
            defaultValue: 'Activity will appear here as you log progress and receive approvals.',
          })}
        </p>
      </div>
    );
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'log':
        return (
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-blue-600 dark:text-blue-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
          </div>
        );
      case 'approval':
        return (
          <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-green-600 dark:text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        );
      case 'comment':
        return (
          <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <svg
              className="w-4 h-4 text-gray-600 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'log':
        return t('ui.logged', { defaultValue: 'Logged' });
      case 'approval':
        return t('ui.approved', { defaultValue: 'Approved' });
      case 'comment':
        return t('ui.commented', { defaultValue: 'Commented' });
      default:
        return type;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {t('ui.recentActivity', { defaultValue: 'Recent Activity' })}
      </h2>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            {getActivityIcon(activity.type)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {activity.user}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {getActivityLabel(activity.type)}
                </Badge>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{activity.item}</div>
              {activity.details && (
                <div className="text-sm text-gray-700 dark:text-gray-300">{activity.details}</div>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {activity.timestamp.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
