'use client';

import {
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InboxArrowDownIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Input from '../ui/Input';
import Spinner from '../ui/Spinner';

import { updateTasksStatus } from '@/lib/firebase/admin';
import type { TaskDoc } from '@/lib/firebase/db';
import { useActiveRotations } from '@/lib/hooks/useActiveRotations';
import { useAllAssignments } from '@/lib/hooks/useAllAssignments';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { useResidentDetail } from '@/lib/hooks/useResidentDetail';
import { useRotationNodes } from '@/lib/hooks/useRotationNodes';
import { useUsersByRole } from '@/lib/hooks/useUsersByRole';
import type { Assignment } from '@/types/assignments';
import type { ResidentProfile, UserProfile } from '@/types/auth';
import type { RotationPetition } from '@/types/rotationPetitions';
import type { Rotation } from '@/types/rotations';

function formatDate(date: Date | null, language: string) {
  if (!date) return '—';
  try {
    const locale = language === 'he' ? 'he-IL' : 'en-US';
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function toDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value?.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      /* noop */
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calcResidencyEnd(resident: ResidentProfile | null | undefined): Date | null {
  if (!resident) return null;
  const start = resident.residencyStartDate ? new Date(resident.residencyStartDate) : null;
  if (!start || Number.isNaN(start.getTime())) return null;
  const durationYears = resident.studyprogramtype === '6-year' ? 5 : 4.5;
  const years = Math.floor(durationYears);
  const months = Math.round((durationYears - years) * 12);
  const end = new Date(start.getTime());
  end.setFullYear(end.getFullYear() + years);
  end.setMonth(end.getMonth() + months);
  return end;
}

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

type ResidentDetailProps = {
  entry: DirectoryEntry | null;
  rotations: Rotation[];
  language: string;
};

function ResidentDetailPanel({ entry, rotations, language }: ResidentDetailProps) {
  const { t } = useTranslation();
  const resident = entry?.resident;
  const activeRotationId = entry?.activeAssignment?.rotationId || null;
  const { tasks, petitions, loading, error, refresh } = useResidentDetail(resident?.uid || null);
  const { nodes, loading: nodesLoading } = useRotationNodes(activeRotationId, {
    enabled: Boolean(activeRotationId),
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const rotationsById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);

  const assignmentsByStatus = useMemo(() => {
    if (!entry) return { active: [], inactive: [], finished: [] as Assignment[] };
    const inactive = entry.assignments.filter((a) => a.status === 'inactive');
    const finished = entry.assignments.filter((a) => a.status === 'finished');
    const active = entry.assignments.filter((a) => a.status === 'active');
    return { active, inactive, finished };
  }, [entry]);

  const rotationStats = useMemo(() => {
    if (!entry || !activeRotationId) {
      return { required: 0, approved: 0, pending: 0, progressPct: 0 };
    }
    const relevantTasks = tasks.filter((task) => task.rotationId === activeRotationId);
    const approved = relevantTasks
      .filter((task) => task.status === 'approved')
      .reduce((sum, task) => sum + (Number(task.count) || 0), 0);
    const pending = relevantTasks
      .filter((task) => task.status === 'pending')
      .reduce((sum, task) => sum + (Number(task.count) || 0), 0);
    const requiredTotal = nodes
      .filter((node) => node.rotationId === activeRotationId && node.type === 'leaf')
      .reduce((sum, node) => sum + (Number(node.requiredCount) || 0), 0);
    const pct = requiredTotal > 0 ? Math.min(100, Math.round((approved / requiredTotal) * 100)) : 0;
    return { required: requiredTotal, approved, pending, progressPct: pct };
  }, [entry, activeRotationId, tasks, nodes]);

  const pendingTasks = useMemo(() => tasks.filter((task) => task.status === 'pending'), [tasks]);

  const timeline = useMemo(() => {
    return [...tasks]
      .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
      .slice(0, 8);
  }, [tasks]);

  const petitionsByStatus = useMemo(() => {
    const pendingList: RotationPetition[] = [];
    const history: RotationPetition[] = [];
    for (const petition of petitions) {
      if (petition.status === 'pending') pendingList.push(petition);
      else history.push(petition);
    }
    return { pendingList, history };
  }, [petitions]);

  const handleTaskAction = useCallback(
    async (task: TaskDoc, status: 'approved' | 'rejected') => {
      try {
        setPendingAction(task.id);
        await updateTasksStatus({ taskIds: [task.id], status });
        await refresh();
      } catch (err) {
        console.error(err);
      } finally {
        setPendingAction(null);
      }
    },
    [refresh],
  );

  if (!resident) {
    return (
      <Card className="p-6">
        <EmptyState
          icon={<UserGroupIcon className="h-12 w-12" aria-hidden="true" />}
          title={t('tutor.noResidentsSelected', { defaultValue: 'Select a resident' }) as string}
          description={
            t('tutor.selectResidentDescription', {
              defaultValue: 'Choose a resident from the list to see their profile insights.',
            }) as string
          }
        />
      </Card>
    );
  }

  const residentProfile: ResidentProfile | null =
    resident?.role === 'resident' ? (resident as ResidentProfile) : null;
  const residencyStart = residentProfile?.residencyStartDate
    ? new Date(residentProfile.residencyStartDate)
    : null;
  const residencyEnd = calcResidencyEnd(residentProfile);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{resident.fullName || resident.uid}</h2>
            <p className="text-sm text-muted-foreground">
              {resident.email || t('ui.noEmail', { defaultValue: 'No email on file' })}
            </p>
            <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {t('ui.residencyStart', { defaultValue: 'Residency start' })}:{' '}
                  {formatDate(residencyStart, language)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span>
                  {t('ui.projectedCompletion', { defaultValue: 'Projected completion' })}:{' '}
                  {formatDate(residencyEnd, language)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground dark:text-white">
              {t('ui.assignedTutors', { defaultValue: 'Assigned tutors' })}
            </div>
            <div className="space-y-1">
              {entry.tutorNames.length > 0 ? (
                entry.tutorNames.map((name) => (
                  <div key={name} className="rounded bg-muted px-2 py-1">
                    {name}
                  </div>
                ))
              ) : (
                <span className="italic text-muted-foreground">
                  {t('ui.noTutorsAssigned', { defaultValue: 'No tutors assigned' })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-4 space-y-3">
          <h3 className="text-base font-semibold">
            {t('ui.rotationProgress', { defaultValue: 'Rotation progress' })}
          </h3>
          {loading || nodesLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              {t('ui.loading', { defaultValue: 'Loading' })}
            </div>
          ) : activeRotationId ? (
            <div className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">
                  {rotationsById.get(activeRotationId)?.name ||
                    t('ui.unknownRotation', { defaultValue: 'Current rotation' })}
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${rotationStats.progressPct}%` }}
                  />
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">
                    {t('ui.required', { defaultValue: 'Required' })}
                  </dt>
                  <dd className="font-semibold">{rotationStats.required}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t('ui.approved', { defaultValue: 'Approved' })}
                  </dt>
                  <dd className="font-semibold">{rotationStats.approved}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t('ui.pending', { defaultValue: 'Pending' })}
                  </dt>
                  <dd className="font-semibold">{rotationStats.pending}</dd>
                </div>
              </dl>
            </div>
          ) : (
            <EmptyState
              icon={<ExclamationCircleIcon className="h-12 w-12" aria-hidden="true" />}
              title={t('ui.noActiveRotation', { defaultValue: 'No active rotation' }) as string}
              description={
                t('ui.noActiveRotationDescription', {
                  defaultValue: 'Assign an active rotation to track progress metrics.',
                }) as string
              }
            />
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="text-base font-semibold">
            {t('ui.rotationStatus', { defaultValue: 'Rotation status' })}
          </h3>
          <div className="space-y-2">
            {(['active', 'inactive', 'finished'] as const).map((status) => {
              const list = assignmentsByStatus[status];
              if (!list || list.length === 0) return null;
              return (
                <div key={status} className="space-y-1">
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">
                    {t(`ui.rotation.${status}`, { defaultValue: status })}
                  </div>
                  <ul className="space-y-1 text-sm">
                    {list.map((assignment) => {
                      const rotation = rotationsById.get(assignment.rotationId);
                      const startDate = formatDate(toDate(assignment.startedAt), language);
                      const endDate = formatDate(toDate(assignment.endedAt), language);
                      return (
                        <li
                          key={assignment.id}
                          className="rounded border border-muted/40 bg-bg/70 px-3 py-2"
                        >
                          <div className="font-medium text-foreground dark:text-white">
                            {rotation?.name ||
                              t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {status === 'active'
                              ? t('ui.startedOn', {
                                  defaultValue: 'Started {{date}}',
                                  date: startDate,
                                })
                              : t('ui.durationRange', {
                                  defaultValue: '{{start}} → {{end}}',
                                  start: startDate,
                                  end: endDate,
                                })}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">
              {t('ui.pendingTaskApprovals', { defaultValue: 'Pending task approvals' })}
            </h3>
            <span className="text-xs text-muted-foreground">
              {t('ui.countPending', {
                defaultValue: '{{count}} pending',
                count: pendingTasks.length,
              })}
            </span>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              {t('ui.loading', { defaultValue: 'Loading' })}
            </div>
          ) : pendingTasks.length === 0 ? (
            <EmptyState
              icon={<CheckCircleIcon className="h-12 w-12" aria-hidden="true" />}
              title={t('ui.noPendingTasks', { defaultValue: 'No pending tasks' }) as string}
              description={
                t('ui.noPendingTasksDescription', {
                  defaultValue: 'New submissions will appear here for quick approval.',
                }) as string
              }
            />
          ) : (
            <ul className="space-y-2">
              {pendingTasks.map((task) => {
                const rotation = rotationsById.get(task.rotationId);
                return (
                  <li key={task.id} className="rounded border border-muted/40 bg-bg/70 p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground dark:text-white">
                          {rotation?.name || t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('ui.taskCounts', {
                            defaultValue: '{{count}} of {{required}} required',
                            count: task.count,
                            required: task.requiredCount,
                          })}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingAction === task.id}
                          onClick={() => handleTaskAction(task, 'approved')}
                        >
                          {t('ui.approve', { defaultValue: 'Approve' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={pendingAction === task.id}
                          onClick={() => handleTaskAction(task, 'rejected')}
                        >
                          {t('ui.reject', { defaultValue: 'Reject' })}
                        </Button>
                      </div>
                    </div>
                    {task.note ? (
                      <div className="mt-2 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                        {task.note}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4 space-y-3">
          <h3 className="text-base font-semibold">
            {t('ui.activityTimeline', { defaultValue: 'Recent activity' })}
          </h3>
          {timeline.length === 0 ? (
            <EmptyState
              icon={<InboxArrowDownIcon className="h-12 w-12" aria-hidden="true" />}
              title={t('ui.noRecentLogs', { defaultValue: 'No recent logs' }) as string}
              description={
                t('ui.noRecentActivityDescription', {
                  defaultValue: 'Recent submissions and approvals will appear here.',
                }) as string
              }
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {timeline.map((task) => {
                const rotation = rotationsById.get(task.rotationId);
                const submitted = formatDate(toDate(task.createdAt), language);
                return (
                  <li key={task.id} className="rounded border border-muted/40 bg-bg/70 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-foreground dark:text-white">
                          {rotation?.name || t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t('ui.submittedOn', {
                            defaultValue: 'Submitted {{date}}',
                            date: submitted,
                          })}
                        </div>
                      </div>
                      <span
                        className={clsx(
                          'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
                          task.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                            : task.status === 'pending'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
                        )}
                      >
                        {task.status === 'approved'
                          ? t('ui.approved', { defaultValue: 'Approved' })
                          : task.status === 'pending'
                            ? t('ui.pending', { defaultValue: 'Pending' })
                            : t('ui.rejected', { defaultValue: 'Rejected' })}
                      </span>
                    </div>
                    {task.note ? (
                      <div className="mt-2 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                        {task.note}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="text-base font-semibold">
          {t('ui.rotationPetitions', { defaultValue: 'Rotation petitions' })}
        </h3>
        {petitions.length === 0 ? (
          <EmptyState
            icon={<InboxArrowDownIcon className="h-12 w-12" aria-hidden="true" />}
            title={t('ui.noPetitions', { defaultValue: 'No petitions' }) as string}
            description={
              t('ui.noPetitionsDescription', {
                defaultValue: 'Rotation activate or finish petitions will show here.',
              }) as string
            }
          />
        ) : (
          <div className="space-y-4 text-sm">
            {petitionsByStatus.pendingList.length > 0 ? (
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-amber-600">
                  {t('ui.pending', { defaultValue: 'Pending' })}
                </div>
                <ul className="space-y-2">
                  {petitionsByStatus.pendingList.map((petition) => (
                    <li
                      key={petition.id}
                      className="rounded border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-500/10"
                    >
                      <div className="font-medium text-amber-700 dark:text-amber-200">
                        {petition.type === 'activate'
                          ? t('ui.petitionActivate', { defaultValue: 'Activate rotation' })
                          : t('ui.petitionFinish', { defaultValue: 'Finish rotation' })}
                      </div>
                      <div className="text-xs text-amber-700/80 dark:text-amber-200/80">
                        {t('ui.submittedOn', {
                          defaultValue: 'Submitted {{date}}',
                          date: formatDate(toDate(petition.requestedAt), language),
                        })}
                      </div>
                      {petition.reason ? (
                        <div className="mt-2 rounded bg-white/60 p-2 text-xs text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                          {petition.reason}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {petitionsByStatus.history.length > 0 ? (
              <div>
                <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {t('ui.history', { defaultValue: 'History' })}
                </div>
                <ul className="space-y-2">
                  {petitionsByStatus.history.map((petition) => (
                    <li key={petition.id} className="rounded border border-muted/40 bg-bg/70 p-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium text-foreground dark:text-white">
                          {petition.type === 'activate'
                            ? t('ui.petitionActivate', { defaultValue: 'Activate rotation' })
                            : t('ui.petitionFinish', { defaultValue: 'Finish rotation' })}
                        </div>
                        <span
                          className={clsx(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            petition.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300',
                          )}
                        >
                          {petition.status === 'approved'
                            ? t('ui.approved', { defaultValue: 'Approved' })
                            : t('ui.rejected', { defaultValue: 'Rejected' })}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('ui.submittedOn', {
                          defaultValue: 'Submitted {{date}}',
                          date: formatDate(toDate(petition.requestedAt), language),
                        })}
                      </div>
                      {petition.reason ? (
                        <div className="mt-2 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                          {petition.reason}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
        {error ? (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </Card>
    </div>
  );
}

export default function ResidentDirectoryPage() {
  const { t, i18n } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const { assignments, loading: assignmentsLoading } = useAllAssignments();
  const { rotations, loading: rotationsLoading } = useActiveRotations();
  const { residents, tutors, loading: usersLoading } = useUsersByRole();
  const [search, setSearch] = useState('');
  const [selectedResidentId, setSelectedResidentId] = useState<string | null>(null);
  const [showMobileDetail, setShowMobileDetail] = useState(false);

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

  useEffect(() => {
    if (!ready) return;
    if (directoryEntries.length === 0) {
      setSelectedResidentId(null);
      return;
    }
    setSelectedResidentId((prev) => {
      if (prev && directoryEntries.some((entry) => entry.resident.uid === prev)) {
        return prev;
      }
      return directoryEntries[0]?.resident.uid ?? null;
    });
  }, [ready, directoryEntries]);

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

  const selectedEntry = useMemo(() => {
    if (!selectedResidentId) return null;
    return directoryEntries.find((entry) => entry.resident.uid === selectedResidentId) || null;
  }, [directoryEntries, selectedResidentId]);

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
      <EmptyState
        icon={<ExclamationCircleIcon className="h-12 w-12" aria-hidden="true" />}
        title={t('ui.accessDenied', { defaultValue: 'Access denied' }) as string}
        description={
          t('ui.accessDeniedDescription', {
            defaultValue: 'This page is available to tutors and administrators only.',
          }) as string
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <div className="lg:w-96 flex-shrink-0 space-y-3">
        <Card className="p-4 space-y-3">
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
                  const isSelected = selectedResidentId === entry.resident.uid;
                  return (
                    <li key={entry.resident.uid}>
                      <button
                        type="button"
                        className={clsx(
                          'flex w-full flex-col gap-1 rounded p-3 text-left transition hover:bg-muted/40 focus:outline-none focus:ring-2 focus:ring-primary/40',
                          isSelected && 'border border-primary/40 bg-primary/5',
                        )}
                        onClick={() => {
                          setSelectedResidentId(entry.resident.uid);
                          setShowMobileDetail(true);
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground dark:text-white">
                            {entry.resident.fullName || entry.resident.uid}
                          </span>
                          {entry.activeAssignment ? (
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

      <div className="flex-1">
        <div className="hidden lg:block">
          <ResidentDetailPanel
            entry={selectedEntry}
            rotations={rotations}
            language={i18n.language}
          />
        </div>
        <div className="lg:hidden">
          {showMobileDetail ? (
            <div className="fixed inset-0 z-50 flex flex-col bg-bg">
              <div className="flex items-center justify-between border-b border-muted/40 px-4 py-3">
                <h2 className="text-base font-semibold">
                  {selectedEntry?.resident.fullName || selectedEntry?.resident.uid}
                </h2>
                <button
                  type="button"
                  className="rounded p-2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowMobileDetail(false)}
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 pb-6">
                <ResidentDetailPanel
                  entry={selectedEntry}
                  rotations={rotations}
                  language={i18n.language}
                />
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              {t('tutor.selectResidentDescription', {
                defaultValue: 'Select a resident to view insights',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
