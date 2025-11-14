'use client';

import { MagnifyingGlassIcon, UserGroupIcon, XMarkIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';

import { useActiveRotations } from '@/lib/hooks/useActiveRotations';
import { useAllAssignments } from '@/lib/hooks/useAllAssignments';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { useUsersByRole } from '@/lib/hooks/useUsersByRole';
import type { Assignment } from '@/types/assignments';
import type { UserProfile } from '@/types/auth';
import type { Rotation } from '@/types/rotations';

function getUserName(user: UserProfile | undefined) {
  if (!user) return '';
  return user.fullName || user.email || user.uid;
}

type DirectoryEntry = {
  resident: UserProfile;
  assignments: Assignment[];
  activeAssignment: Assignment | null;
  activeRotation: Rotation | null;
  tutorNames: string[];
};

export default function ResidentDirectoryPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { assignments, loading: assignmentsLoading } = useAllAssignments();
  const { rotations, loading: rotationsLoading } = useActiveRotations();
  const { residents, tutors, loading: usersLoading } = useUsersByRole();
  const [search, setSearch] = useState('');

  const ready =
    !!me && !assignmentsLoading && !rotationsLoading && !usersLoading && residents.length >= 0;

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

  const directoryEntries: DirectoryEntry[] = useMemo(() => {
    return residents
      .filter((resident) => (me?.role === 'admin' ? true : accessibleResidentIds.has(resident.uid)))
      .map((resident) => {
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
      })
      .sort((a, b) => getUserName(a.resident).localeCompare(getUserName(b.resident)));
  }, [residents, assignments, rotationsById, tutorById, me?.role, accessibleResidentIds]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return directoryEntries;
    const needle = search.trim().toLowerCase();
    return directoryEntries.filter((entry) => {
      const name = getUserName(entry.resident).toLowerCase();
      const email = (entry.resident.email || '').toLowerCase();
      const rotationName = entry.activeRotation?.name?.toLowerCase?.() || '';
      return name.includes(needle) || email.includes(needle) || rotationName.includes(needle);
    });
  }, [directoryEntries, search]);

  if (!me) {
    return (
      <div className="py-24">
        <Spinner className="mx-auto h-8 w-8" />
      </div>
    );
  }

  const allowAccess = me.role === 'admin' || me.role === 'tutor';

  if (!allowAccess) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        {t('errors.unauthorized', { defaultValue: 'You do not have access to this page.' })}
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,360px)_1fr]">
      <div className="space-y-4">
        <Card className="p-3">
          <div className="relative">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('ui.searchResidents', { defaultValue: 'Search residents' }) as string}
              className="pl-9"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                aria-label={t('ui.clearSearch', { defaultValue: 'Clear search' }) as string}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t('ui.totalResidents', { defaultValue: 'Residents' })}</span>
            <span>
              {filteredEntries.length}/{directoryEntries.length}
            </span>
          </div>
        </Card>

        <Card className="p-2">
          {ready ? (
            filteredEntries.length === 0 ? (
              <EmptyState
                icon={<UserGroupIcon className="h-12 w-12" aria-hidden="true" />}
                title={t('ui.noResidents', { defaultValue: 'No residents found' }) as string}
                description={
                  t('ui.noResidentsDescription', {
                    defaultValue: 'Adjust your search or check assignment filters.',
                  }) as string
                }
              />
            ) : (
              <ul className="divide-y divide-muted/20">
                {filteredEntries.map((entry) => {
                  const isActive = entry.activeAssignment?.status === 'active';
                  return (
                    <li key={entry.resident.uid}>
                      <button
                        type="button"
                        className={clsx(
                          'flex w-full flex-col gap-1 rounded p-3 text-left transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40',
                        )}
                        onClick={() => router.push(`/residents/${entry.resident.uid}`)}
                        aria-label={
                          t('ui.viewResidentProfile', {
                            defaultValue: 'View resident profile',
                          }) as string
                        }
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground dark:text-white">
                            {entry.resident.fullName || entry.resident.uid}
                          </span>
                          {isActive ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                              {t('ui.active', { defaultValue: 'Active' })}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.activeRotation?.name ||
                            t('ui.noActiveRotation', { defaultValue: 'No active rotation' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {entry.tutorNames.length > 0
                            ? entry.tutorNames.join(', ')
                            : t('ui.noTutorsAssigned', { defaultValue: 'Unassigned' })}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Spinner className="mx-auto mb-2 h-4 w-4" />
              {t('ui.loading', { defaultValue: 'Loading' })}
            </div>
          )}
        </Card>
      </div>

      <div className="hidden items-center justify-center rounded border border-dashed border-muted/50 p-8 text-center text-sm text-muted-foreground lg:flex">
        {t('tutor.residentDirectoryInstruction', {
          defaultValue: 'Select a resident to open their detailed profile.',
        })}
      </div>
    </div>
  );
}
