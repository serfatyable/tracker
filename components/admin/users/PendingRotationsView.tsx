'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  approveRotationSelectionRequest,
  listPendingRotationRequests,
  listRotations,
  rejectRotationSelectionRequest,
} from '../../../lib/firebase/admin';
import type { ResidentProfile } from '../../../types/auth';
import type { Rotation } from '../../../types/rotations';
import RotationSelection from '../../auth/RotationSelection';
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

type SelectionState = {
  currentRotationId: string;
  completedRotationIds: string[];
};

type ToastState = {
  message: string;
  variant: 'success' | 'error';
} | null;

export default function PendingRotationsView() {
  const { t, i18n } = useTranslation();
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [selectionEdits, setSelectionEdits] = useState<Record<string, SelectionState>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, 'approve' | 'reject'>>({});
  const [toast, setToast] = useState<ToastState>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rotationsRes, pendingResidents] = await Promise.all([
        listRotations({ limit: 200 }),
        listPendingRotationRequests(),
      ]);

      setRotations(rotationsRes.items);
      setResidents(pendingResidents);
      setSelectionEdits(() => {
        const initial: Record<string, SelectionState> = {};
        pendingResidents.forEach((resident) => {
          const request = resident.rotationSelectionRequest;
          initial[resident.uid] = {
            currentRotationId: request?.requestedCurrentRotationId || '',
            completedRotationIds: request?.requestedCompletedRotationIds || [],
          };
        });
        return initial;
      });
    } catch (error) {
      console.error('Failed to load pending rotation requests', error);
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

  const rotationOptions = useMemo(() => rotations, [rotations]);

  const handleSelectionChange = useCallback(
    (residentId: string, change: Partial<SelectionState>) => {
      setSelectionEdits((prev) => {
        const existing = prev[residentId] || { currentRotationId: '', completedRotationIds: [] };
        return {
          ...prev,
          [residentId]: {
            currentRotationId: change.currentRotationId ?? existing.currentRotationId,
            completedRotationIds: change.completedRotationIds ?? existing.completedRotationIds,
          },
        };
      });
    },
    [],
  );

  const removeResidentFromQueue = useCallback((residentId: string) => {
    setResidents((prev) => prev.filter((resident) => resident.uid !== residentId));
    setSelectionEdits((prev) => {
      const { [residentId]: _removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const handleApprove = useCallback(
    async (residentId: string) => {
      const selection = selectionEdits[residentId] || {
        currentRotationId: '',
        completedRotationIds: [],
      };
      if (!selection.currentRotationId) {
        setToast({
          message: t('admin.users.rotationApprovalNeedsCurrent', {
            defaultValue: 'Select an active rotation before approving.',
          }) as string,
          variant: 'error',
        });
        return;
      }

      setActionLoading((prev) => ({ ...prev, [residentId]: 'approve' }));
      try {
        await approveRotationSelectionRequest({
          residentId,
          currentRotationId: selection.currentRotationId,
          completedRotationIds: selection.completedRotationIds,
        });
        setToast({
          message: t('admin.users.rotationApprovalSuccess', {
            defaultValue: 'Rotation selections approved.',
          }) as string,
          variant: 'success',
        });
        removeResidentFromQueue(residentId);
      } catch (error) {
        console.error('Failed to approve rotation request', error);
        setToast({
          message: t('ui.operationFailed', { defaultValue: 'Operation failed. Please try again.' }),
          variant: 'error',
        });
      } finally {
        setActionLoading((prev) => {
          const { [residentId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [removeResidentFromQueue, selectionEdits, t],
  );

  const handleReject = useCallback(
    async (residentId: string) => {
      setActionLoading((prev) => ({ ...prev, [residentId]: 'reject' }));
      try {
        await rejectRotationSelectionRequest(residentId);
        setToast({
          message: t('admin.users.rotationApprovalRejected', {
            defaultValue: 'Rotation selections marked as rejected.',
          }) as string,
          variant: 'success',
        });
        removeResidentFromQueue(residentId);
      } catch (error) {
        console.error('Failed to reject rotation request', error);
        setToast({
          message: t('ui.operationFailed', { defaultValue: 'Operation failed. Please try again.' }),
          variant: 'error',
        });
      } finally {
        setActionLoading((prev) => {
          const { [residentId]: _removed, ...rest } = prev;
          return rest;
        });
      }
    },
    [removeResidentFromQueue, t],
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
      ) : residents.length === 0 ? (
        <EmptyState
          icon={<ChecklistIcon />}
          title={
            t('admin.users.noPendingRotationRequests', {
              defaultValue: 'No pending rotation approvals',
            }) as string
          }
          description={
            t('admin.users.noPendingRotationRequestsDescription', {
              defaultValue: 'New resident rotation selections will appear here once submitted.',
            }) as string
          }
        />
      ) : (
        <div className="space-y-4">
          {residents.map((resident) => {
            const selection = selectionEdits[resident.uid] || {
              currentRotationId: '',
              completedRotationIds: [],
            };
            const request = resident.rotationSelectionRequest;
            const submittedLabel = formatTimestamp(request?.submittedAt, locale);
            const isApproving = actionLoading[resident.uid] === 'approve';
            const isRejecting = actionLoading[resident.uid] === 'reject';
            const activeLanguage = resident.settings?.language || 'en';

            return (
              <div key={resident.uid} className="card-levitate space-y-4 p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {resident.fullName || resident.email || resident.uid}
                    </h3>
                    {resident.email ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">{resident.email}</p>
                    ) : null}
                    {submittedLabel ? (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {t('admin.users.rotationRequestSubmittedAt', {
                          defaultValue: 'Submitted {{time}}',
                          time: submittedLabel,
                        })}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(resident.uid)}
                      loading={isRejecting}
                    >
                      {t('ui.reject', { defaultValue: 'Reject' })}
                    </Button>
                    <Button
                      onClick={() => handleApprove(resident.uid)}
                      loading={isApproving}
                      className="bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      {t('ui.approve', { defaultValue: 'Approve' })}
                    </Button>
                  </div>
                </div>

                <RotationSelection
                  rotations={rotationOptions}
                  completedRotationIds={selection.completedRotationIds}
                  currentRotationId={selection.currentRotationId}
                  onCompletedChange={(ids) =>
                    handleSelectionChange(resident.uid, { completedRotationIds: ids })
                  }
                  onCurrentChange={(id) =>
                    handleSelectionChange(resident.uid, { currentRotationId: id })
                  }
                  language={activeLanguage}
                  disabled={isApproving || isRejecting}
                  completedLabel={t('auth.completedRotations', {
                    defaultValue: 'Completed rotations',
                  })}
                  currentLabel={t('auth.currentRotation', { defaultValue: 'Current rotation' })}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
