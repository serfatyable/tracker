'use client';

import { getAuth } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { createRotationPetition } from '../../lib/firebase/db';
import Button from '../ui/Button';
// import TextField from '../ui/TextField';

type RotationPetitionDialogProps = {
  open: boolean;
  onClose: () => void;
  rotationId: string;
  rotationName: string;
  type: 'activate' | 'finish';
  onSuccess?: () => void;
};

export default function RotationPetitionDialog({
  open,
  onClose,
  rotationId,
  rotationName,
  type,
  onSuccess,
}: RotationPetitionDialogProps) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setReason('');
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    const currentUser = getAuth(getFirebaseApp()).currentUser;

    if (!currentUser) {
      setError(
        t('petitions.authRequired', {
          defaultValue: 'You must be signed in to submit this petition.',
        }) as string,
      );
      setLoading(false);
      return;
    }

    try {
      await createRotationPetition({
        residentId: currentUser.uid,
        rotationId,
        type,
        reason: reason.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error('Error creating petition:', err);
      setError(
        t('petitions.createError', {
          defaultValue: 'Failed to create petition. Please try again.',
        }) as string,
      );
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] p-4 flex items-end sm:items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-lg border bg-white dark:bg-[rgb(var(--surface))] border-gray-200 dark:border-[rgb(var(--border))] shadow-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {type === 'activate'
              ? t('petitions.requestActivation', { defaultValue: 'Request Activation' })
              : t('petitions.requestCompletion', { defaultValue: 'Request Completion' })}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded hover:bg-black/5 dark:hover:bg-white/5"
            aria-label={t('ui.close')}
          >
            ×
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-xs text-gray-600 dark:text-gray-300 mb-1">
              {t('petitions.rotation', { defaultValue: 'Rotation' })}
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
              {rotationName}
            </div>
          </div>

          <div>
            <label
              htmlFor="petition-reason"
              className="block text-xs mb-1 text-gray-600 dark:text-gray-300"
            >
              {t('petitions.reasonOptional', { defaultValue: 'Reason (Optional)' })}
            </label>
            <textarea
              id="petition-reason"
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('petitions.reasonPlaceholder', {
                defaultValue: 'Explain why you need this rotation activated or completed...',
              })}
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading} className="flex-1">
              {t('ui.cancel')}
            </Button>
            <Button onClick={handleSubmit} loading={loading} className="flex-1">
              {t('petitions.submit', { defaultValue: 'Submit' })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
