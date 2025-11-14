'use client';

import {
  ArrowRightIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '../ui/Avatar';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';

import { getResidentPalette } from './residentPalette';

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

        <Card className="p-0">
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
              <ul className="mx-auto max-w-2xl space-y-3 p-2 sm:p-3">
                {filteredEntries.map((entry) => {
                  const isActive = entry.activeAssignment?.status === 'active';
                  const palette = getResidentPalette(
                    entry.activeRotation?.id || entry.resident.uid,
                  );
                  return (
                    <li key={entry.resident.uid}>
                      <button
                        type="button"
                        className={clsx(
                          'group relative flex w-full items-center gap-4 overflow-hidden rounded-3xl border border-muted/20 p-4 text-left transition',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/40',
                          palette.rosterBackground,
                          'hover:-translate-y-0.5 hover:shadow-2xl',
                        )}
                        onClick={() => router.push(`/residents/${entry.resident.uid}`)}
                        aria-label={
                          t('ui.viewResidentProfile', {
                            defaultValue: 'View resident profile',
                          }) as string
                        }
                      >
                        <span
                          className={clsx(
                            'absolute inset-y-0 left-0 w-1 rounded-r-full opacity-90 transition group-hover:opacity-100',
                            palette.rosterStripe,
                          )}
                          aria-hidden="true"
                        />
                        <Avatar
                          size={54}
                          name={entry.resident.fullName || entry.resident.uid}
                          email={entry.resident.email || undefined}
                          className="text-base"
                        />
                        <div className="flex flex-1 flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-base font-semibold text-foreground dark:text-white">
                              {entry.resident.fullName || entry.resident.uid}
                            </span>
                            {isActive ? (
                              <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-200">
                                {t('ui.active', { defaultValue: 'Active' })}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-white/40 px-3 py-1 font-medium text-foreground/80 dark:bg-white/10 dark:text-white/80">
                              {entry.activeRotation?.name ||
                                t('ui.noActiveRotation', { defaultValue: 'No active rotation' })}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] uppercase tracking-wide opacity-70">
                              {entry.assignments.length}{' '}
                              {t('ui.totalAssignments', { defaultValue: 'rotations' })}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {entry.tutorNames.length > 0 ? (
                              entry.tutorNames.map((name) => (
                                <span
                                  key={name}
                                  className="rounded-full bg-black/10 px-3 py-1 font-medium text-foreground/80 dark:bg-white/10 dark:text-white/80"
                                >
                                  {name}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full bg-black/10 px-3 py-1 font-medium text-foreground/70 dark:bg-white/10 dark:text-white/70">
                                {t('ui.noTutorsAssigned', { defaultValue: 'Unassigned' })}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRightIcon className="h-5 w-5 flex-shrink-0 text-muted-foreground transition group-hover:translate-x-1" />
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

      <Card
        tone="sky"
        variant="tinted"
        className="hidden flex-col items-center justify-center text-center lg:flex"
        title={t('tutor.residentDirectoryInstruction', {
          defaultValue: 'Select a resident to open their detailed profile.',
        })}
        subtitle={t('ui.residentDirectorySubtitle', {
          defaultValue:
            'Use the roster to search, filter, and jump straight into vibrant resident insights.',
        })}
      >
        <div className="mx-auto max-w-sm text-sm opacity-75">
          {t('ui.residentDirectoryHint', {
            defaultValue:
              'Tap any card to view progress, pending approvals, and petitions in a dedicated profile view.',
          })}
        </div>
      </Card>
    </div>
  );
}
