'use client';

import {
  AcademicCapIcon,
  UserGroupIcon,
  ClockIcon,
  ChartPieIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '@/types/assignments';
import type { UserProfile } from '@/types/auth';
import type { RotationPetition } from '@/types/rotationPetitions';
import type { Rotation } from '@/types/rotations';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';

type Props = {
  meUid: string;
  rotations: Rotation[];
  assignments: Assignment[];
  residents: UserProfile[];
  petitions: RotationPetition[];
  tutors: UserProfile[];
};

type RotationWithStats = {
  rotation: Rotation;
  residentsCount: number;
  pendingPetitions: number;
  completionRate: number;
  health: 'excellent' | 'good' | 'needs-attention';
  recentActivity: string;
};

export default function TutorRotationsGrid({
  meUid,
  rotations,
  assignments,
  residents,
  petitions,
  tutors,
}: Props) {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const tutorById = useMemo(() => new Map(tutors.map((t) => [t.uid, t])), [tutors]);

  const assignmentsByRotation = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const arr = map.get(a.rotationId) || [];
      arr.push(a);
      map.set(a.rotationId, arr);
    }
    return map;
  }, [assignments]);

  const petitionsByRotation = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of petitions) {
      if (p.status === 'pending') {
        map.set(p.rotationId, (map.get(p.rotationId) || 0) + 1);
      }
    }
    return map;
  }, [petitions]);

  const ownedRotations = useMemo(() => {
    return rotations
      .filter((r) => (r.ownerTutorIds || []).includes(meUid))
      .sort((a, b) => {
        const nameA = i18n.language === 'he' && a.name_he ? a.name_he : a.name || a.name_en || '';
        const nameB = i18n.language === 'he' && b.name_he ? b.name_he : b.name || b.name_en || '';
        return nameA.localeCompare(nameB);
      });
  }, [rotations, meUid, i18n.language]);

  const rotationsWithStats = useMemo<RotationWithStats[]>(() => {
    return ownedRotations.map((rotation) => {
      const assigns = assignmentsByRotation.get(rotation.id) || [];
      const residentsCount = assigns.length;
      const pendingPetitions = petitionsByRotation.get(rotation.id) || 0;

      // Mock completion rate - replace with actual calculation
      const completionRate = Math.floor(Math.random() * 40 + 60); // 60-100%

      let health: 'excellent' | 'good' | 'needs-attention' = 'excellent';
      if (completionRate < 70) health = 'needs-attention';
      else if (completionRate < 85) health = 'good';

      return {
        rotation,
        residentsCount,
        pendingPetitions,
        completionRate,
        health,
        recentActivity: '2h ago', // Replace with actual data
      };
    });
  }, [ownedRotations, assignmentsByRotation, petitionsByRotation]);

  const getRotationName = (rotation: Rotation) => {
    if (i18n.language === 'he' && rotation.name_he) return rotation.name_he;
    return rotation.name || rotation.name_en || '';
  };

  const getOwnerNames = (ownerIds: string[] | undefined) => {
    if (!ownerIds?.length) return '-';
    return ownerIds
      .map((id) => {
        const tutor = tutorById.get(id);
        if (i18n.language === 'he' && tutor?.fullNameHe) return tutor.fullNameHe;
        return tutor?.fullName || id;
      })
      .join(', ');
  };

  const healthColors = {
    excellent: {
      badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
      ring: 'ring-emerald-400/30',
      gradient: 'from-emerald-500/10 to-teal-500/10',
    },
    good: {
      badge: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
      ring: 'ring-sky-400/30',
      gradient: 'from-sky-500/10 to-indigo-500/10',
    },
    'needs-attention': {
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
      ring: 'ring-amber-400/30',
      gradient: 'from-amber-500/10 to-orange-500/10',
    },
  };

  const healthLabels = {
    excellent: t('tutor.rotations.excellent'),
    good: t('tutor.rotations.good'),
    'needs-attention': t('tutor.rotations.needsAttention'),
  };

  if (!rotationsWithStats.length) {
    return (
      <Card
        tone="indigo"
        variant="tinted"
        title={t('tutor.rotations.title')}
        subtitle={t('tutor.rotations.subtitle')}
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
            <AcademicCapIcon className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <p className="text-center text-sm text-gray-600 dark:text-gray-300">
            {t('tutor.rotations.noRotations')}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card
      tone="indigo"
      variant="tinted"
      title={t('tutor.rotations.title')}
      subtitle={t('tutor.rotations.subtitle')}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rotationsWithStats.map(({ rotation, residentsCount, pendingPetitions, completionRate, health, recentActivity }) => {
          const colors = healthColors[health];

          return (
            <div
              key={rotation.id}
              className={`group relative overflow-hidden rounded-xl bg-gradient-to-br ${colors.gradient} p-5 shadow-sm ring-1 ${colors.ring} transition-all hover:scale-[1.02] hover:shadow-md dark:bg-opacity-20`}
            >
              {/* Header */}
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="truncate font-semibold text-gray-900 dark:text-gray-50">
                    {getRotationName(rotation)}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge className={colors.badge}>
                      {healthLabels[health]}
                    </Badge>
                  </div>
                </div>
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-white/60 shadow-sm dark:bg-slate-800/60">
                  <ChartPieIcon className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
              </div>

              {/* Donut chart representation with stats */}
              <div className="mb-4 flex items-center justify-center">
                <div className="relative">
                  {/* SVG Donut Chart */}
                  <svg className="h-24 w-24 -rotate-90 transform">
                    {/* Background circle */}
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - completionRate / 100)}`}
                      strokeLinecap="round"
                      className={
                        health === 'excellent'
                          ? 'text-emerald-500'
                          : health === 'good'
                            ? 'text-sky-500'
                            : 'text-amber-500'
                      }
                    />
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900 dark:text-gray-50">
                      {completionRate}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="mb-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <UserGroupIcon className="h-4 w-4" />
                    {t('tutor.rotations.residents')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {residentsCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <ClockIcon className="h-4 w-4" />
                    {t('tutor.rotations.pendingPetitions')}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-50">
                    {pendingPetitions}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{t('tutor.rotations.recentActivity')}</span>
                  <span>{recentActivity}</span>
                </div>
              </div>

              {/* Owners */}
              <div className="mb-4 border-t border-gray-200/60 pt-3 dark:border-gray-700/60">
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('tutor.rotations.owners')}: {getOwnerNames(rotation.ownerTutorIds)}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push(`/resident/rotations?rot=${rotation.id}`)}
                >
                  {t('tutor.rotations.openCurriculum')}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/tutor/residents?rotation=${rotation.id}`)}
                >
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
