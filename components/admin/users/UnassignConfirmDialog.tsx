'use client';

import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import Button from '../../ui/Button';
import Toast from '../../ui/Toast';

interface UnassignConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  residentName?: string;
  tutorName?: string;
  rotationName?: string;
  isGlobal?: boolean;
  loading?: boolean;
  error?: string | null;
}

export default function UnassignConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  residentName,
  tutorName,
  rotationName,
  isGlobal = false,
  loading = false,
  error = null,
}: UnassignConfirmDialogProps) {
  const { t } = useTranslation();

  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error handling is done by parent component
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {error && <Toast message={error} variant="error" onClear={() => {}} />}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('ui.confirmUnassign', { defaultValue: 'Confirm Unassignment' })}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              disabled={loading}
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {t('ui.unassignConfirmMessage', {
                    defaultValue:
                      'Are you sure you want to unassign {{tutorName}} from {{residentName}}?',
                    tutorName: tutorName || 'Unknown Tutor',
                    residentName: residentName || 'Unknown Resident',
                  })}
                </p>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">
                  <div className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('ui.assignmentDetails', { defaultValue: 'Assignment Details' })}
                  </div>
                  <div className="space-y-1 text-gray-600 dark:text-gray-400">
                    <div>
                      <span className="font-medium">Resident:</span> {residentName || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Tutor:</span> {tutorName || 'Unknown'}
                    </div>
                    <div>
                      <span className="font-medium">Scope:</span>{' '}
                      {isGlobal ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                          {t('ui.globalAssignment', { defaultValue: 'Global' })}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                          {rotationName || 'Unknown Rotation'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              {t('ui.cancel')}
            </Button>
            <Button
              onClick={handleConfirm}
              loading={loading}
              className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
            >
              {t('ui.unassign', { defaultValue: 'Unassign' })}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
