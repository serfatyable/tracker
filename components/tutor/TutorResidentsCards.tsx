'use client';

import {
  UserCircleIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { assignTutorToResident, unassignTutorFromResident } from '@/lib/firebase/admin';
import type { Assignment } from '@/types/assignments';
import type { UserProfile } from '@/types/auth';
import type { Rotation } from '@/types/rotations';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type Props = {
  meUid: string;
  assignments: Assignment[];
  rotations: Rotation[];
  residents: UserProfile[];
  ownedRotationIds: Set<string>;
};

type ResidentWithProgress = {
  resident: UserProfile;
  assignment: Assignment;
  rotation: Rotation;
  progressPercentage: number;
  recentActivity: string;
  isOwned: boolean;
  hasMe: boolean;
};

export default function TutorResidentsCards({
  meUid,
  assignments,
  rotations,
  residents,
  ownedRotationIds,
}: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const resById = useMemo(() => new Map(residents.map((r) => [r.uid, r])), [residents]);
  const rotById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);

  const residentsWithProgress = useMemo<ResidentWithProgress[]>(() => {
    const mine = assignments.filter((a) => (a.tutorIds || []).includes(meUid));

    return mine
      .map((assignment) => {
        const resident = resById.get(assignment.residentId);
        const rotation = rotById.get(assignment.rotationId);
        if (!resident || !rotation) return null;

        // TODO: Calculate actual progress from resident's task completion
        // This would require:
        // 1. Fetching all tasks for this resident in this rotation
        // 2. Calculating: (completed tasks / total required tasks) * 100
        // For now, showing 0 to indicate data not yet available
        const progressPercentage = 0;

        // TODO: Calculate actual recent activity timestamp
        // This would require fetching the most recent task submission for this resident
        const recentActivity = '--';

        return {
          resident,
          assignment,
          rotation,
          progressPercentage,
          recentActivity,
          isOwned: ownedRotationIds.has(rotation.id),
          hasMe: (assignment.tutorIds || []).includes(meUid),
        };
      })
      .filter(Boolean) as ResidentWithProgress[];
  }, [assignments, meUid, resById, rotById, ownedRotationIds]);

  if (!residentsWithProgress.length) {
    return (
      <Card
        tone="sky"
        variant="tinted"
        title={t('tutor.residentsCards.title')}
        subtitle={t('tutor.residentsCards.subtitle')}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/20">
            <UserCircleIcon className="h-8 w-8 text-sky-600 dark:text-sky-400" />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {t('tutor.residentsCards.noResidents')}
          </p>
        </div>
      </Card>
    );
  }

  const getRotationName = (rotation: Rotation) => {
    if (i18n.language === 'he' && rotation.name_he) return rotation.name_he;
    return rotation.name || rotation.name_en || '';
  };

  const getResidentName = (resident: UserProfile) => {
    if (i18n.language === 'he' && resident.fullNameHe) return resident.fullNameHe;
    return resident.fullName || resident.email || '';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'bg-emerald-500';
    if (percentage >= 50) return 'bg-sky-500';
    if (percentage >= 25) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <Card
      tone="sky"
      variant="tinted"
      title={t('tutor.residentsCards.title')}
      subtitle={t('tutor.residentsCards.subtitle')}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {residentsWithProgress.map(({ resident, assignment, rotation, progressPercentage, recentActivity, isOwned, hasMe }) => (
          <div
            key={assignment.id}
            className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:scale-[1.02] hover:shadow-md dark:border-gray-700 dark:bg-slate-800/60"
          >
            {/* Header with avatar and name */}
            <div className="mb-4 flex items-start gap-3">
              <Avatar
                name={getResidentName(resident)}
                email={resident.email}
                size={48}
              />
              <div className="flex-1 min-w-0">
                <h3 className="truncate font-semibold text-gray-900 dark:text-gray-50">
                  {getResidentName(resident)}
                </h3>
                <Badge variant="outline" className="mt-1 text-xs">
                  {getRotationName(rotation)}
                </Badge>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-300">
                  {t('tutor.residentsCards.progress')}
                </span>
                <span className="font-semibold text-gray-900 dark:text-gray-50">
                  {progressPercentage}%
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor(progressPercentage)}`}
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            {/* Recent activity */}
            <div className="mb-4 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <CheckCircleIcon className="h-4 w-4" />
              <span>{t('tutor.residentsCards.lastActivity')}: {recentActivity}</span>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => router.push(`/residents/${resident.uid}`)}
              >
                <UserCircleIcon className="h-4 w-4" />
                {t('tutor.residentsCards.viewProfile')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => router.push(`/tutor/tasks?resident=${resident.uid}`)}
              >
                <ChartBarIcon className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {/* Message functionality */}}
              >
                <ChatBubbleLeftIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Self-assign/unassign for owned rotations */}
            {isOwned && (
              <div className="mt-3 border-t border-gray-200 pt-3 dark:border-gray-700">
                {!hasMe ? (
                  <Button
                    size="sm"
                    className="w-full border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-300 dark:hover:bg-emerald-900/30"
                    variant="outline"
                    disabled={busy === assignment.id}
                    onClick={async () => {
                      setBusy(assignment.id);
                      try {
                        await assignTutorToResident(resident.uid, meUid);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {t('tutor.selfAssign')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full border-amber-500 text-amber-700 hover:bg-amber-50 dark:border-amber-500 dark:text-amber-300 dark:hover:bg-amber-900/30"
                    variant="outline"
                    disabled={busy === assignment.id}
                    onClick={async () => {
                      setBusy(assignment.id);
                      try {
                        await unassignTutorFromResident(resident.uid, meUid);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  >
                    {t('tutor.unassign')}
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
