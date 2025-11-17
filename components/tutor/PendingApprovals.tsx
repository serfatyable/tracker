'use client';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { approveRotationPetition, denyRotationPetition } from '../../lib/firebase/admin';
import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import type { RotationPetition } from '../../types/rotationPetitions';
import Button from '../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../ui/Dialog';

type Props = {
  petitions: RotationPetition[];
  residentIdToName: (id: string) => string;
};

export default function PendingApprovals({ petitions, residentIdToName }: Props) {
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const [confirm, setConfirm] = useState<{ id: string; action: 'approve' | 'deny' } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onConfirm = async () => {
    if (!confirm || !me) return;
    setBusyId(confirm.id);
    try {
      if (confirm.action === 'approve') await approveRotationPetition(confirm.id, me.uid);
      else await denyRotationPetition(confirm.id, me.uid);
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  if (!petitions.length) return null;

  return (
    <div className="card-levitate p-3">
      <div className="font-semibold mb-2">{t('tutor.pendingApprovals')}</div>
      <div className="space-y-2">
        {petitions.map((p) => (
          <div key={p.id} className="border rounded p-2 flex items-center justify-between text-sm">
            <div className="flex flex-col">
              <span className="font-medium">{residentIdToName(p.residentId)}</span>
              <span className="opacity-70 text-xs">
                {p.type === 'activate' ? 'Activate rotation' : 'Finish rotation'}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                variant="outline"
                disabled={busyId === p.id}
                onClick={() => setConfirm({ id: p.id, action: 'approve' })}
              >
                Approve
              </Button>
              <Button
                size="sm"
                className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                variant="outline"
                disabled={busyId === p.id}
                onClick={() => setConfirm({ id: p.id, action: 'deny' })}
              >
                Deny
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <div className="p-3 space-y-2">
          <DialogHeader>
            {confirm?.action === 'approve' ? 'Approve petition' : 'Deny petition'}
          </DialogHeader>
          <div className="text-sm">Are you sure?</div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={!confirm || busyId === confirm?.id}>
              Confirm
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
