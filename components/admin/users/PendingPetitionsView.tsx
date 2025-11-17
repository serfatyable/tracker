'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RotationPetitionWithDetails } from '../../../types/rotationPetitions';
import { CardSkeleton } from '../../dashboard/Skeleton';
import Button from '../../ui/Button';
import EmptyState, { ChecklistIcon } from '../../ui/EmptyState';
import Toast from '../../ui/Toast';

function formatTimestamp(value: unknown, locale: string) {
  if (!value) return null;
  try {
    if (typeof (value as any).toDate === 'function') {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format((value as any).toDate());
    }
    if (value instanceof Date) {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(value);
    }
  } catch (err) {
    console.error('Failed to format timestamp', err);
  }
  return null;
}

type ToastState = {
  message: string;
  variant: 'success' | 'error';
} | null;

export default function PendingPetitionsView() {
  const { t, i18n } = useTranslation();
  const [petitions, setPetitions] = useState<RotationPetitionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, 'approve' | 'deny'>>({});
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/rotation-petitions?status=pending');
      if (!response.ok) {
        throw new Error('Failed to fetch petitions');
      }
      const data = await response.json();
      setPetitions(data.petitions || []);
    } catch (error) {
      console.error('Failed to load rotation petitions', error);
      setToast({
        message: t('ui.operationFailed', { defaultValue: 'Operation failed. Please try again.' }),
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const removePetitionFromQueue = useCallback((petitionId: string) => {
    setPetitions((prev) => prev.filter((p) => p.id !== petitionId));
  }, []);

  const handleApprove = useCallback(
    async (petitionId: string) => {
      setActionLoading((prev) => ({ ...prev, [petitionId]: 'approve' }));
      try {
        const response = await fetch('/api/rotation-petitions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petitionId, action: 'approve' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to approve petition');
        }

        setToast({
          message: t('admin.users.petitionApproved', {
            defaultValue: 'Petition approved successfully.',
          }) as string,
          variant: 'success',
        });
        removePetitionFromQueue(petitionId);
      } catch (error) {
        console.error('Failed to approve petition', error);
        setToast({
          message: error instanceof Error ? error.message : t('ui.operationFailed', { defaultValue: 'Operation failed. Please try again.' }),
          variant: 'error',
        });
      } finally {
        setActionLoading((prev) => {
          const { [petitionId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [removePetitionFromQueue, t],
  );

  const handleDeny = useCallback(
    async (petitionId: string) => {
      setActionLoading((prev) => ({ ...prev, [petitionId]: 'deny' }));
      try {
        const response = await fetch('/api/rotation-petitions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ petitionId, action: 'deny' }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to deny petition');
        }

        setToast({
          message: t('admin.users.petitionDenied', {
            defaultValue: 'Petition denied.',
          }) as string,
          variant: 'success',
        });
        removePetitionFromQueue(petitionId);
      } catch (error) {
        console.error('Failed to deny petition', error);
        setToast({
          message: error instanceof Error ? error.message : t('ui.operationFailed', { defaultValue: 'Operation failed. Please try again.' }),
          variant: 'error',
        });
      } finally {
        setActionLoading((prev) => {
          const { [petitionId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [removePetitionFromQueue, t],
  );

  const locale = i18n.language || 'en';

  return (
    <div className="space-y-4">
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((key) => (
            <CardSkeleton key={key} />
          ))}
        </div>
      ) : petitions.length === 0 ? (
        <EmptyState
          icon={<ChecklistIcon />}
          title={
            t('admin.users.noPendingPetitions', {
              defaultValue: 'No pending rotation petitions',
            }) as string
          }
          description={
            t('admin.users.noPendingPetitionsDescription', {
              defaultValue: 'Resident rotation activation/completion requests will appear here.',
            }) as string
          }
        />
      ) : (
        <div className="space-y-4">
          {petitions.map((petition) => {
            const isApproving = actionLoading[petition.id] === 'approve';
            const isDenying = actionLoading[petition.id] === 'deny';
            const requestedLabel = formatTimestamp(petition.requestedAt, locale);
            const residentName = petition.residentName || petition.residentId;
            const rotationName = petition.rotationName || petition.rotationId;

            return (
              <div key={petition.id} className="card-levitate space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {residentName}
                      </h3>
                      <span
                        className={
                          'inline-flex rounded-full px-2 py-1 text-xs font-medium ' +
                          (petition.type === 'activate'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200')
                        }
                      >
                        {petition.type === 'activate'
                          ? t('admin.users.petitionTypeActivate', { defaultValue: 'Activate' })
                          : t('admin.users.petitionTypeFinish', { defaultValue: 'Finish' })}
                      </span>
                    </div>
                    <p className="text-base text-gray-700 dark:text-gray-300 mt-1">
                      <span className="font-medium">
                        {t('admin.users.petitionRotation', { defaultValue: 'Rotation:' })}
                      </span>{' '}
                      {rotationName}
                    </p>
                    {petition.reason && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        <span className="font-medium">
                          {t('admin.users.petitionReason', { defaultValue: 'Reason:' })}
                        </span>{' '}
                        {petition.reason}
                      </p>
                    )}
                    {requestedLabel && (
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {t('admin.users.petitionRequestedAt', {
                          defaultValue: 'Requested {{time}}',
                          time: requestedLabel,
                        })}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDeny(petition.id)}
                      loading={isDenying}
                      disabled={isApproving}
                    >
                      {t('ui.deny', { defaultValue: 'Deny' })}
                    </Button>
                    <Button
                      onClick={() => handleApprove(petition.id)}
                      loading={isApproving}
                      disabled={isDenying}
                      className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      {t('ui.approve', { defaultValue: 'Approve' })}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
