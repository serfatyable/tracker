'use client';

import { UserGroupIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

import UnassignedQueues from './UnassignedQueues';

type Props = {
  assignments: Assignment[];
  residents: UserProfile[];
  tutors: UserProfile[];
  rotations: Array<{ id: string; name: string }>;
  allUsers: UserProfile[];
};

export default function PeopleInsights({
  assignments,
  residents,
  tutors,
  rotations,
  allUsers,
}: Props): React.ReactElement {
  const { t } = useTranslation();

  const { zeroLoadTutors, pendingUsers } = useMemo(() => {
    // Calculate zero-load tutors
    const load = new Map<string, number>();
    for (const tutor of tutors) load.set(tutor.uid, 0);
    for (const assignment of assignments) {
      for (const tutorId of assignment.tutorIds || []) {
        load.set(tutorId, (load.get(tutorId) || 0) + 1);
      }
    }
    const zeroLoad = tutors.filter((t) => (load.get(t.uid) || 0) === 0);

    // Get pending users
    const pending = allUsers.filter((u) => u.status === 'pending');

    return { zeroLoadTutors: zeroLoad, pendingUsers: pending };
  }, [assignments, tutors, allUsers]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">
          {t('dashboard.peopleInsights', { defaultValue: 'People Insights' })}
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unassigned Residents */}
        <UnassignedQueues assignments={assignments} residents={residents} rotations={rotations} />

        {/* Zero Load Tutors */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <UserGroupIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {t('dashboard.tutorsWithZeroLoad', { defaultValue: 'Tutors with Zero Load' })}
              </h3>
              <p className="text-xs text-foreground/60">
                {t('dashboard.tutorsWithZeroLoadDesc', {
                  defaultValue: 'Tutors without active assignments',
                })}
              </p>
            </div>
          </div>

          {zeroLoadTutors.length === 0 ? (
            <div className="text-sm text-foreground/60 py-4 text-center">
              {t('dashboard.allTutorsAssigned', { defaultValue: 'All tutors have assignments' })}
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {zeroLoadTutors.slice(0, 5).map((tutor) => (
                <div
                  key={tutor.uid}
                  className="flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 transition-colors"
                >
                  <span className="text-sm text-foreground">{tutor.fullName || tutor.uid}</span>
                  <span className="text-xs text-foreground/50">
                    {tutor.email?.split('@')[0] || ''}
                  </span>
                </div>
              ))}
              {zeroLoadTutors.length > 5 && (
                <div className="text-xs text-center text-foreground/60 pt-2">
                  +{zeroLoadTutors.length - 5} {t('dashboard.more', { defaultValue: 'more' })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Pending User Registrations */}
        <div className="card-levitate p-4 col-span-1 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <UserPlusIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {t('dashboard.pendingUserRegistrations', {
                    defaultValue: 'Pending User Registrations',
                  })}
                </h3>
                <p className="text-xs text-foreground/60">
                  {t('dashboard.pendingUserRegistrationsDesc', {
                    defaultValue: 'New users waiting for approval',
                  })}
                </p>
              </div>
            </div>
            {pendingUsers.length > 0 && (
              <Link
                href="/admin/users"
                className="text-sm font-medium text-primary hover:underline"
              >
                {t('dashboard.reviewAll', { defaultValue: 'Review all' })}
              </Link>
            )}
          </div>

          {pendingUsers.length === 0 ? (
            <div className="text-sm text-foreground/60 py-4 text-center">
              {t('dashboard.noPendingUsers', { defaultValue: 'No pending user registrations' })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {pendingUsers.slice(0, 6).map((user) => (
                <div
                  key={user.uid}
                  className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                >
                  <div className="font-medium text-sm text-foreground">{user.fullName}</div>
                  <div className="text-xs text-foreground/60 mt-1">{user.email}</div>
                  <div className="mt-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'resident'
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : user.role === 'tutor'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                      }`}
                    >
                      {user.role}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {pendingUsers.length > 6 && (
            <div className="text-sm text-center text-foreground/60 mt-4">
              +{pendingUsers.length - 6} {t('dashboard.moreUsers', { defaultValue: 'more users' })}{' '}
              <Link href="/admin/users" className="text-primary hover:underline">
                {t('dashboard.viewAll', { defaultValue: 'View all' })}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
