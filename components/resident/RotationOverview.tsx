'use client';

import { getAuth } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { useRotationDetails } from '../../lib/hooks/useRotationDetails';
import Button from '../ui/Button';

import RotationPetitionDialog from './RotationPetitionDialog';

type Props = {
  rotationId: string | null;
};

export default function RotationOverview({ rotationId }: Props) {
  const { t } = useTranslation();
  const { rotation } = useRotationDetails(rotationId);
  const [petitionDialogOpen, setPetitionDialogOpen] = useState(false);
  const [petitionType, setPetitionType] = useState<'activate' | 'finish'>('activate');

  const currentUser = getAuth(getFirebaseApp()).currentUser;
  const residentId = currentUser?.uid || '';

  const showActivationButton = rotation?.status === 'inactive';
  const showCompletionButton = rotation?.status === 'active';

  const handleActivateClick = () => {
    setPetitionType('activate');
    setPetitionDialogOpen(true);
  };

  const handleFinishClick = () => {
    setPetitionType('finish');
    setPetitionDialogOpen(true);
  };

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

  if (!rotation) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('ui.loading', { defaultValue: 'Loading...' })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rotation Status & Petition Buttons */}
      <div className="card-levitate p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('petitions.rotationStatus', { defaultValue: 'Rotation Status' })}
              </div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
                {rotation.status === 'inactive' &&
                  t('petitions.inactive', { defaultValue: 'Inactive' })}
                {rotation.status === 'active' && t('petitions.active', { defaultValue: 'Active' })}
                {rotation.status === 'finished' &&
                  t('petitions.finished', { defaultValue: 'Finished' })}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {showActivationButton && (
              <Button onClick={handleActivateClick} variant="default" className="flex-1">
                {t('petitions.requestActivation', { defaultValue: 'Request Activation' })}
              </Button>
            )}
            {showCompletionButton && (
              <Button
                onClick={handleFinishClick}
                variant="outline"
                className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                {t('petitions.requestCompletion', { defaultValue: 'Request Completion' })}
              </Button>
            )}
          </div>
        </div>
      </div>

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

      {/* Petition Dialog */}
      {rotation && (
        <RotationPetitionDialog
          open={petitionDialogOpen}
          onClose={() => setPetitionDialogOpen(false)}
          rotationId={rotation.id}
          rotationName={rotation.name}
          type={petitionType}
          residentId={residentId}
          onSuccess={() => {
            // Could show a success toast here
          }}
        />
      )}
    </div>
  );
}
