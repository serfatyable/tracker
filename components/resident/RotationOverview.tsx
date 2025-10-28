'use client';

import { getAuth } from 'firebase/auth';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { useResidentPendingPetition } from '../../lib/hooks/useResidentPendingPetition';
import { useResidentRotationStatus } from '../../lib/hooks/useResidentRotationStatus';
import { useRotationDetails } from '../../lib/hooks/useRotationDetails';
import Button from '../ui/Button';

import RotationPetitionDialog from './RotationPetitionDialog';

type Props = {
  rotationId: string | null;
};

export default function RotationOverview({ rotationId }: Props) {
  const { t } = useTranslation();
  const { rotation } = useRotationDetails(rotationId);
  const { status: assignmentStatus, loading: statusLoading } =
    useResidentRotationStatus(rotationId);
  const { petition: pendingPetition, loading: petitionLoading } =
    useResidentPendingPetition(rotationId);
  const [petitionDialogOpen, setPetitionDialogOpen] = useState(false);
  const [petitionType, setPetitionType] = useState<'activate' | 'finish'>('activate');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const currentUser = getAuth(getFirebaseApp()).currentUser;
  const residentId = currentUser?.uid || '';

  // Determine the display status
  const getDisplayStatus = () => {
    if (pendingPetition) {
      return 'waiting';
    }
    if (assignmentStatus === 'active') {
      return 'active';
    }
    if (assignmentStatus === 'finished') {
      return 'finished';
    }
    return 'inactive';
  };

  const displayStatus = getDisplayStatus();

  // Button visibility logic
  const showStartButton =
    !pendingPetition && (assignmentStatus === 'inactive' || assignmentStatus === null);
  const showFinishButton = !pendingPetition && assignmentStatus === 'active';

  const handleActivateClick = () => {
    setPetitionType('activate');
    setPetitionDialogOpen(true);
  };

  const handleFinishClick = () => {
    setPetitionType('finish');
    setPetitionDialogOpen(true);
  };

  const handlePetitionSuccess = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 5000);
  };

  // Status pill styling
  const getStatusPillClasses = () => {
    switch (displayStatus) {
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      case 'waiting':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200';
      case 'finished':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getStatusText = () => {
    switch (displayStatus) {
      case 'inactive':
        return t('petitions.notStarted', { defaultValue: 'Not Started' });
      case 'waiting':
        return t('petitions.waitingForApproval', { defaultValue: 'Waiting for Approval' });
      case 'active':
        return t('petitions.active', { defaultValue: 'Active' });
      case 'finished':
        return t('petitions.finished', { defaultValue: 'Finished' });
      default:
        return t('petitions.notStarted', { defaultValue: 'Not Started' });
    }
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

  if (!rotation || statusLoading || petitionLoading) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('ui.loading', { defaultValue: 'Loading...' })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="card-levitate p-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="text-sm font-medium text-green-800 dark:text-green-200">
              {t('petitions.petitionSubmitted', {
                defaultValue: 'Petition submitted successfully!',
              })}
            </span>
          </div>
        </div>
      )}

      {/* Rotation Status & Petition Buttons */}
      <div className="card-levitate p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {t('petitions.rotationStatus', { defaultValue: 'Rotation Status' })}
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusPillClasses()}`}
                >
                  {getStatusText()}
                </span>
              </div>
            </div>
          </div>

          {/* Visible CTA(s) */}
          <div className="flex gap-2">
            {showStartButton && (
              <Button onClick={handleActivateClick} variant="default" className="flex-1">
                {t('petitions.startRotation', { defaultValue: 'Start Rotation' })}
              </Button>
            )}
            {showFinishButton && (
              <Button
                onClick={handleFinishClick}
                variant="outline"
                className="flex-1 border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/30"
              >
                {t('petitions.finishRotation', { defaultValue: 'Finish Rotation' })}
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
          onSuccess={handlePetitionSuccess}
        />
      )}
    </div>
  );
}
