'use client';

import { useTranslation } from 'react-i18next';

import { useRotationPetitions } from '../../lib/hooks/useRotationPetitions';
// import Badge from '../ui/Badge';
import { EmptyIcon } from '../ui/EmptyState';

type PetitionsListViewProps = {
  residentId: string;
};

export default function PetitionsListView({ residentId }: PetitionsListViewProps) {
  const { t } = useTranslation();
  const { petitions, loading, error } = useRotationPetitions(residentId);

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card-levitate p-4 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        {t('petitions.loadError', { defaultValue: 'Failed to load petitions' })}
      </div>
    );
  }

  if (petitions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-4">
          <EmptyIcon />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('petitions.noPetitions', { defaultValue: 'No petitions yet' })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {petitions.map((petition) => (
        <div key={petition.id} className="card-levitate p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    petition.type === 'activate'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                  }`}
                >
                  {petition.type === 'activate'
                    ? t('petitions.activation', { defaultValue: 'Activation' })
                    : t('petitions.completion', { defaultValue: 'Completion' })}
                </span>
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    petition.status === 'pending'
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                      : petition.status === 'approved'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
                  }`}
                >
                  {petition.status === 'pending' &&
                    t('petitions.pending', { defaultValue: 'Pending' })}
                  {petition.status === 'approved' &&
                    t('petitions.approved', { defaultValue: 'Approved' })}
                  {petition.status === 'denied' &&
                    t('petitions.denied', { defaultValue: 'Denied' })}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {t('petitions.rotation', { defaultValue: 'Rotation' })}:{' '}
                <span className="font-medium">{petition.rotationId}</span>
              </div>
              {petition.reason && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">{petition.reason}</p>
              )}
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                {t('petitions.requestedAt', { defaultValue: 'Requested' })}:{' '}
                {petition.requestedAt &&
                  new Date(petition.requestedAt.toMillis?.() || 0).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
