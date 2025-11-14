'use client';

import { ArrowLeftIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Spinner from '../ui/Spinner';

import ResidentDetailContent, { type ResidentDirectoryEntry } from './ResidentDetailContent';

import { useActiveRotations } from '@/lib/hooks/useActiveRotations';
import { useAllAssignments } from '@/lib/hooks/useAllAssignments';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { useUsersByRole } from '@/lib/hooks/useUsersByRole';
import type { UserProfile } from '@/types/auth';

type ResidentDetailPageProps = {
  residentId: string | null;
  onBack?: () => void;
};

function getUserName(user: UserProfile | undefined) {
  if (!user) return '';
  return user.fullName || user.email || user.uid;
}

export default function ResidentDetailPage({ residentId, onBack }: ResidentDetailPageProps) {
  const { t, i18n } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { assignments, loading: assignmentsLoading } = useAllAssignments();
  const { rotations, loading: rotationsLoading } = useActiveRotations();
  const { residents, tutors, loading: usersLoading } = useUsersByRole();

  const ready = !!me && !!residentId && !assignmentsLoading && !rotationsLoading && !usersLoading;

  const tutorById = useMemo(() => new Map(tutors.map((t) => [t.uid, t])), [tutors]);
  const rotationsById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);

  const accessibleResidentIds = useMemo(() => {
    if (!me) return new Set<string>();
    if (me.role === 'admin') {
      return new Set(residents.map((resident) => resident.uid));
    }
    const set = new Set<string>();
    assignments.forEach((assignment) => {
      if ((assignment.tutorIds || []).includes(me.uid)) {
        set.add(assignment.residentId);
      }
    });
    return set;
  }, [me, residents, assignments]);

  const resident = useMemo(() => {
    if (!residentId) return null;
    return residents.find((user) => user.uid === residentId) || null;
  }, [residents, residentId]);

  const entry: ResidentDirectoryEntry | null = useMemo(() => {
    if (!resident) return null;
    const assignmentList = assignments.filter(
      (assignment) => assignment.residentId === resident.uid,
    );
    const activeAssignment =
      assignmentList.find((assignment) => assignment.status === 'active') || null;
    const activeRotation = activeAssignment
      ? rotationsById.get(activeAssignment.rotationId) || null
      : null;
    const tutorIds = activeAssignment?.tutorIds || [];
    const tutorNames = tutorIds
      .map((id) => getUserName(tutorById.get(id)))
      .filter((name): name is string => Boolean(name));
    return {
      resident,
      assignments: assignmentList,
      activeAssignment,
      activeRotation,
      tutorNames,
    };
  }, [resident, assignments, rotationsById, tutorById]);

  if (!residentId) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {t('ui.noResidents', { defaultValue: 'No resident selected.' })}
      </Card>
    );
  }

  if (!me) {
    return (
      <div className="py-24">
        <Spinner className="mx-auto h-8 w-8" />
      </div>
    );
  }

  if (me.role !== 'admin' && me.role !== 'tutor') {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {t('errors.unauthorized', { defaultValue: 'You do not have access to this page.' })}
      </Card>
    );
  }

  if (!ready) {
    return (
      <div className="py-24">
        <Spinner className="mx-auto h-8 w-8" />
      </div>
    );
  }

  if (!resident || !accessibleResidentIds.has(resident.uid)) {
    return (
      <EmptyState
        icon={<UserGroupIcon className="h-12 w-12" aria-hidden="true" />}
        title={t('ui.residentNotFound', { defaultValue: 'Resident not available' }) as string}
        description={
          t('ui.residentNotFoundDescription', {
            defaultValue:
              'This resident is not assigned to you or is no longer active. Return to the directory to pick another.',
          }) as string
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {onBack ? (
        <Button variant="ghost" onClick={onBack} className="flex w-fit items-center gap-2">
          <ArrowLeftIcon className="h-4 w-4" />
          {t('ui.backToResidents', { defaultValue: 'Back to residents' })}
        </Button>
      ) : null}
      <ResidentDetailContent entry={entry} rotations={rotations} language={i18n.language} />
    </div>
  );
}
