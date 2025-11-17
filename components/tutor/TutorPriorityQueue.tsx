'use client';

import { ClockIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Dialog, DialogHeader, DialogFooter } from '@/components/ui/Dialog';
import { approveRotationPetition, denyRotationPetition } from '@/lib/firebase/admin';
import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import type { RotationPetition } from '@/types/rotationPetitions';

type Props = {
  petitions: RotationPetition[];
  residentIdToName: (id: string) => string;
  residentIdToEmail: (id: string) => string | undefined;
};

function getUrgencyLevel(requestedAt: any): 'high' | 'medium' | 'low' {
  if (!requestedAt) return 'low';

  const now = new Date();
  let submittedDate: Date;

  if (typeof requestedAt.toDate === 'function') {
    submittedDate = requestedAt.toDate();
  } else if (requestedAt instanceof Date) {
    submittedDate = requestedAt;
  } else {
    return 'low';
  }

  const daysOld = (now.getTime() - submittedDate.getTime()) / (1000 * 60 * 60 * 24);

  if (daysOld >= 5) return 'high';
  if (daysOld >= 2) return 'medium';
  return 'low';
}

function formatTimeAgo(requestedAt: any, language: string): string {
  if (!requestedAt) return '';

  let submittedDate: Date;

  if (typeof requestedAt.toDate === 'function') {
    submittedDate = requestedAt.toDate();
  } else if (requestedAt instanceof Date) {
    submittedDate = requestedAt;
  } else {
    return '';
  }

  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - submittedDate.getTime()) / (1000 * 60));

  if (diffInMinutes < 60) {
    return language === 'he' ? `לפני ${diffInMinutes} דקות` : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return language === 'he' ? `לפני ${diffInHours} שעות` : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  return language === 'he' ? `לפני ${diffInDays} ימים` : `${diffInDays}d ago`;
}

export default function TutorPriorityQueue({
  petitions,
  residentIdToName,
  residentIdToEmail,
}: Props) {
  const { t, i18n } = useTranslation();
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

  // Sort by urgency and date
  const sortedPetitions = [...petitions].sort((a, b) => {
    const urgencyA = getUrgencyLevel(a.requestedAt);
    const urgencyB = getUrgencyLevel(b.requestedAt);

    const urgencyOrder = { high: 0, medium: 1, low: 2 };
    if (urgencyOrder[urgencyA] !== urgencyOrder[urgencyB]) {
      return urgencyOrder[urgencyA] - urgencyOrder[urgencyB];
    }

    // If same urgency, sort by date (oldest first)
    const dateA = a.requestedAt?.toDate?.() || new Date(0);
    const dateB = b.requestedAt?.toDate?.() || new Date(0);
    return dateA.getTime() - dateB.getTime();
  });

  if (!sortedPetitions.length) {
    return (
      <Card
        tone="teal"
        variant="tinted"
        title={t('tutor.priorityQueue.title')}
        subtitle={t('tutor.priorityQueue.subtitle')}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
            <CheckCircleIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {t('tutor.priorityQueue.noApprovals')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      tone="teal"
      variant="tinted"
      title={t('tutor.priorityQueue.title')}
      subtitle={t('tutor.priorityQueue.subtitle')}
    >
      <div className="space-y-3">
        {sortedPetitions.map((p) => {
          const urgency = getUrgencyLevel(p.requestedAt);
          const timeAgo = formatTimeAgo(p.requestedAt, i18n.language);
          const residentName = residentIdToName(p.residentId);
          const residentEmail = residentIdToEmail(p.residentId);

          const urgencyColors = {
            high: 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-900/10',
            medium: 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10',
            low: 'border-gray-200 bg-white dark:border-gray-700 dark:bg-slate-800/40',
          };

          const urgencyBadgeColors = {
            high: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
            medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            low: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
          };

          return (
            <div
              key={p.id}
              className={`flex flex-col gap-4 rounded-xl border p-4 shadow-sm transition-all hover:shadow-md md:flex-row md:items-center md:justify-between ${urgencyColors[urgency]}`}
            >
              <div className="flex items-center gap-3">
                <Avatar name={residentName} email={residentEmail} size={40} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-50">
                      {residentName}
                    </span>
                    {urgency !== 'low' && (
                      <Badge className={urgencyBadgeColors[urgency]}>
                        {urgency === 'high'
                          ? t('tutor.priorityQueue.urgent')
                          : t('tutor.priorityQueue.needsAttention')}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <span>
                      {p.type === 'activate'
                        ? t('tutor.priorityQueue.activateRotation')
                        : t('tutor.priorityQueue.finishRotation')}
                    </span>
                    {timeAgo && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <ClockIcon className="h-3.5 w-3.5" />
                          {timeAgo}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                  variant="outline"
                  disabled={busyId === p.id}
                  onClick={() => setConfirm({ id: p.id, action: 'approve' })}
                >
                  <CheckCircleIcon className="h-4 w-4" />
                  {t('tutor.approve')}
                </Button>
                <Button
                  size="sm"
                  className="border-rose-500 text-rose-700 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-300 dark:hover:bg-rose-900/30"
                  variant="outline"
                  disabled={busyId === p.id}
                  onClick={() => setConfirm({ id: p.id, action: 'deny' })}
                >
                  <XCircleIcon className="h-4 w-4" />
                  {t('tutor.deny')}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirm} onClose={() => setConfirm(null)}>
        <div className="space-y-4 p-4">
          <DialogHeader>
            {confirm?.action === 'approve'
              ? t('tutor.priorityQueue.confirmApprove')
              : t('tutor.priorityQueue.confirmDeny')}
          </DialogHeader>
          <div className="text-sm text-gray-600 dark:text-gray-300">{t('ui.areYouSure')}</div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setConfirm(null)}>
              {t('ui.cancel')}
            </Button>
            <Button onClick={onConfirm} disabled={!confirm || busyId === confirm?.id}>
              {t('ui.confirm')}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </Card>
  );
}
