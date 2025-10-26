'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { approveRotationPetition, denyRotationPetition } from '../../lib/firebase/admin';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import type { RotationPetition } from '../../types/rotationPetitions';
import Button from '../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../ui/Dialog';

type Props = {
  petitions: RotationPetition[];
  rotationIdToName: (id: string) => string;
  residentIdToName: (id: string) => string;
};

export default function PetitionsTab({ petitions, rotationIdToName, residentIdToName }: Props) {
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const [confirm, setConfirm] = useState<{ id: string; action: 'approve' | 'deny' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onConfirm = async () => {
    if (!confirm || !me) return;
    setBusyId(confirm.id);
    try {
      if (confirm.action === 'approve') {
        await approveRotationPetition(confirm.id, me.uid);
      } else {
        await denyRotationPetition(confirm.id, me.uid);
      }
      setConfirm(null);
    } catch (error) {
      console.error('Error handling petition:', error);
    } finally {
      setBusyId(null);
    }
  };

  if (petitions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('petitions.noPetitions', { defaultValue: 'No petitions yet' })}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {petitions.map((p) => (
          <div key={p.id} className="card-levitate p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                      (p.type === 'activate'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                        : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200')
                    }
                  >
                    {p.type === 'activate'
                      ? t('petitions.activation', { defaultValue: 'Activation' })
                      : t('petitions.completion', { defaultValue: 'Completion' })}
                  </span>
                  <span
                    className={
                      'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                      (p.status === 'pending'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                        : p.status === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200')
                    }
                  >
                    {p.status === 'pending' && t('petitions.pending', { defaultValue: 'Pending' })}
                    {p.status === 'approved' && t('petitions.approved', { defaultValue: 'Approved' })}
                    {p.status === 'denied' && t('petitions.denied', { defaultValue: 'Denied' })}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('petitions.rotation', { defaultValue: 'Rotation' })}:{' '}
                  <span className="font-medium">{rotationIdToName(p.rotationId)}</span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  {t('ui.resident', { defaultValue: 'Resident' })}:{' '}
                  <span className="font-medium">{residentIdToName(p.residentId)}</span>
                </div>
                {p.reason && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-2">
                    <strong>{t('petitions.reason', { defaultValue: 'Reason' })}:</strong> {p.reason}
                  </p>
                )}
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {t('petitions.requestedAt', { defaultValue: 'Requested' })}:{' '}
                  {p.requestedAt &&
                    new Date(p.requestedAt.toMillis?.() || 0).toLocaleDateString()}
                </div>
              </div>

              {p.status === 'pending' && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => setConfirm({ id: p.id, action: 'approve' })}
                  >
                    {t('tutor.approve', { defaultValue: 'Approve' })}
                  </Button>
                  <Button
                    size="sm"
                    className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                    variant="outline"
                    disabled={busyId === p.id}
                    onClick={() => setConfirm({ id: p.id, action: 'deny' })}
                  >
                    {t('tutor.deny', { defaultValue: 'Deny' })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <div className="p-3 space-y-2">
          <DialogHeader>
            {confirm?.action === 'approve'
              ? t('petitions.approveConfirm', { defaultValue: 'Approve petition' })
              : t('petitions.denyConfirm', { defaultValue: 'Deny petition' })}
          </DialogHeader>
          <div className="text-sm">
            {confirm?.action === 'approve'
              ? t('petitions.approveConfirmText', {
                  defaultValue: 'Are you sure you want to approve this petition?',
                })
              : t('petitions.denyConfirmText', {
                  defaultValue: 'Are you sure you want to deny this petition?',
                })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              {t('ui.cancel')}
            </Button>
            <Button onClick={onConfirm} disabled={!confirm || busyId === confirm?.id}>
              {t('ui.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </>
  );
}
