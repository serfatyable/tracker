'use client';

import { useTranslation } from 'react-i18next';

type Props = {
  rotationId: string | null;
};

export default function RotationOverview({ rotationId }: Props) {
  const { t } = useTranslation();

  // TODO: Get actual data from props or context
  const stats = {
    total: 0,
    approved: 0,
    pending: 0,
    notStarted: 0,
  };

  if (!rotationId) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('ui.selectRotation', { defaultValue: 'Select a rotation to view overview' })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-levitate p-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('ui.total', { defaultValue: 'Total' })}
          </div>
        </div>

        <div className="card-levitate p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {stats.approved}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('ui.approved', { defaultValue: 'Approved' })}
          </div>
        </div>

        <div className="card-levitate p-4">
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.pending}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('ui.pending', { defaultValue: 'Pending' })}
          </div>
        </div>

        <div className="card-levitate p-4">
          <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
            {stats.notStarted}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('ui.notStarted', { defaultValue: 'Not Started' })}
          </div>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="card-levitate p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          {t('ui.progress', { defaultValue: 'Progress' })}
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t('ui.completion', { defaultValue: 'Completion' })}
            </span>
            <span className="font-medium">
              {stats.total > 0 ? Math.round((stats.approved / stats.total) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${stats.total > 0 ? (stats.approved / stats.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* TODO: Add mini charts if data is available */}
      <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
        {t('ui.chartsComingSoon', { defaultValue: 'Detailed charts coming soon' })}
      </div>
    </div>
  );
}
