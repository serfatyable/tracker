'use client';

import {
  CalendarIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  InboxArrowDownIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Spinner from '../ui/Spinner';

import { updateTasksStatus } from '@/lib/firebase/admin';
import type { TaskDoc } from '@/lib/firebase/db';
import { useResidentDetail } from '@/lib/hooks/useResidentDetail';
import { useRotationNodes } from '@/lib/hooks/useRotationNodes';
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

export type ResidentDirectoryEntry = {
  resident: UserProfile;
  assignments: Assignment[];
  activeAssignment: Assignment | null;
  activeRotation: Rotation | null;
  tutorNames: string[];
};

type ResidentDetailContentProps = {
  entry: ResidentDirectoryEntry | null;
  rotations: Rotation[];
  language: string;
  onRefresh?: () => Promise<void> | void;
};

export default function ResidentDetailContent({
  entry,
  rotations,
  language,
  onRefresh,
}: ResidentDetailContentProps) {
  const { t } = useTranslation();
  const resident = entry?.resident;
  const activeRotationId = entry?.activeAssignment?.rotationId || null;
  const { tasks, petitions, loading, error, refresh } = useResidentDetail(resident?.uid || null);
  const {
    nodes,
    byId: nodeById,
    loading: nodesLoading,
  } = useRotationNodes(activeRotationId, {
    enabled: Boolean(activeRotationId),
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const rotationsById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);

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
        if (onRefresh) await onRefresh();
      } catch (err) {
        console.error(err);
      } finally {
        setPendingAction(null);
      }
    },
    [refresh, onRefresh],
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
                  {t('ui.residencyEnd', { defaultValue: 'Residency end' })}:{' '}
                  {formatDate(residencyEnd, language)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 text-sm text-muted-foreground">
            <div>{t('ui.activeRotation', { defaultValue: 'Active rotation' })}</div>
            <div className="text-base font-medium text-foreground">
              {entry?.activeRotation?.name ||
                t('ui.noActiveRotation', { defaultValue: 'Unassigned' })}
            </div>
            {entry?.tutorNames?.length ? (
              <div className="text-xs">
                {t('ui.tutors', { defaultValue: 'Tutors' })}: {entry.tutorNames.join(', ')}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="border-b border-muted/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('ui.rotationProgress', { defaultValue: 'Rotation progress' })}
            </h3>
          </div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded border border-muted/40 bg-bg p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('ui.required', { defaultValue: 'Required' })}
                </div>
                <div className="text-2xl font-semibold">{rotationStats.required}</div>
              </div>
              <div className="rounded border border-muted/40 bg-bg p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('ui.approved', { defaultValue: 'Approved' })}
                </div>
                <div className="text-2xl font-semibold">{rotationStats.approved}</div>
              </div>
              <div className="rounded border border-muted/40 bg-bg p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('ui.pending', { defaultValue: 'Pending' })}
                </div>
                <div className="text-2xl font-semibold">{rotationStats.pending}</div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('ui.completion', { defaultValue: 'Completion' })}
              </div>
              <div className="mt-2 h-2 rounded-full bg-muted/40">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${rotationStats.progressPct}%` }}
                />
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{rotationStats.progressPct}%</div>
            </div>
            <div className="rounded border border-muted/40 bg-bg p-3 text-sm text-muted-foreground">
              {nodesLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" />
                  {t('ui.loading', { defaultValue: 'Loading' })}
                </div>
              ) : entry?.activeRotation ? (
                <div>
                  {t('ui.rotationRequirementsDescription', {
                    defaultValue:
                      'Progress is calculated based on approved tasks compared to required counts for this rotation.',
                  })}
                </div>
              ) : (
                <div>
                  {t('ui.noActiveRotationDescription', {
                    defaultValue: 'Assign a rotation to track progress for this resident.',
                  })}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="border-b border-muted/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('ui.taskApprovals', { defaultValue: 'Task approvals' })}
            </h3>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                {t('ui.loading', { defaultValue: 'Loading' })}
              </div>
            ) : pendingTasks.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon className="h-12 w-12 text-emerald-500" aria-hidden="true" />}
                title={t('ui.noPendingTasks', { defaultValue: 'No pending tasks' }) as string}
                description={
                  t('ui.noPendingTasksDescription', {
                    defaultValue: 'Great job! There are no pending approvals for this resident.',
                  }) as string
                }
              />
            ) : (
              <ul className="space-y-3">
                {pendingTasks.map((task) => {
                  const node = nodeById?.[task.itemId];
                  return (
                    <li key={task.id} className="rounded border border-muted/40 bg-bg p-3">
                      <div className="text-sm font-medium text-foreground">
                        {node?.name || task.itemId || t('ui.task', { defaultValue: 'Task' })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t('ui.submittedOn', { defaultValue: 'Submitted' })}:{' '}
                        {formatDate(toDate(task.createdAt), language)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleTaskAction(task, 'approved')}
                          disabled={pendingAction === task.id}
                        >
                          {pendingAction === task.id && <Spinner className="mr-2 h-3 w-3" />}
                          {t('ui.approve', { defaultValue: 'Approve' })}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleTaskAction(task, 'rejected')}
                          disabled={pendingAction === task.id}
                        >
                          {pendingAction === task.id && <Spinner className="mr-2 h-3 w-3" />}
                          {t('ui.reject', { defaultValue: 'Reject' })}
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="border-b border-muted/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('ui.rotationHistory', { defaultValue: 'Rotation history' })}
            </h3>
          </div>
          <div className="p-4">
            {entry?.assignments?.length ? (
              <ul className="space-y-3">
                {entry.assignments.map((assignment) => {
                  const rotation = rotationsById.get(assignment.rotationId);
                  const startDate = formatDate(toDate(assignment.startedAt), language);
                  const endDate = formatDate(toDate(assignment.endedAt), language);
                  return (
                    <li
                      key={`${assignment.rotationId}-${assignment.startedAt}`}
                      className="rounded border border-muted/40 bg-bg p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">
                          {rotation?.name || t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                        </div>
                        <div
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${
                            assignment.status === 'active'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
                              : assignment.status === 'finished'
                                ? 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
                          }`}
                        >
                          {assignment.status}
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {startDate} — {endDate}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState
                icon={<InboxArrowDownIcon className="h-10 w-10" aria-hidden="true" />}
                title={t('ui.noAssignments', { defaultValue: 'No assignments yet' }) as string}
                description={
                  t('ui.noAssignmentsDescription', {
                    defaultValue: 'Assign rotations to begin tracking this resident’s progress.',
                  }) as string
                }
              />
            )}
          </div>
        </Card>

        <Card>
          <div className="border-b border-muted/40 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t('ui.activityTimeline', { defaultValue: 'Recent activity' })}
            </h3>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" />
                {t('ui.loading', { defaultValue: 'Loading' })}
              </div>
            ) : timeline.length === 0 ? (
              <EmptyState
                icon={<InboxArrowDownIcon className="h-10 w-10" aria-hidden="true" />}
                title={t('ui.noRecentActivity', { defaultValue: 'No recent activity' }) as string}
                description={
                  t('ui.noRecentActivityDescription', {
                    defaultValue: 'New submissions, reflections, and tasks will appear here.',
                  }) as string
                }
              />
            ) : (
              <ul className="space-y-3">
                {timeline.map((task) => {
                  const node = nodeById?.[task.itemId];
                  return (
                    <li key={task.id} className="rounded border border-muted/40 bg-bg p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-sm font-medium text-foreground">
                          {node?.name || task.itemId || t('ui.task', { defaultValue: 'Task' })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(toDate(task.createdAt), language)}
                        </div>
                      </div>
                      <div className="text-xs capitalize text-muted-foreground">{task.status}</div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-muted/40 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t('ui.rotationPetitions', { defaultValue: 'Rotation petitions' })}
          </h3>
        </div>
        <div className="grid gap-4 p-4 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <ExclamationCircleIcon className="h-4 w-4" />
              {t('ui.pendingPetitions', { defaultValue: 'Pending petitions' })}
            </h4>
            {petitionsByStatus.pendingList.length === 0 ? (
              <EmptyState
                icon={<CheckCircleIcon className="h-10 w-10 text-emerald-500" aria-hidden="true" />}
                title={
                  t('ui.noPendingPetitions', { defaultValue: 'No pending petitions' }) as string
                }
                description={
                  t('ui.noPendingPetitionsDescription', {
                    defaultValue: 'Pending activation/finish requests will appear here.',
                  }) as string
                }
              />
            ) : (
              <ul className="space-y-3 text-sm">
                {petitionsByStatus.pendingList.map((petition) => (
                  <li key={petition.id} className="rounded border border-muted/40 bg-bg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">
                        {rotationsById.get(petition.rotationId)?.name ||
                          t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-amber-600">
                        {petition.type}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('ui.submittedOn', { defaultValue: 'Submitted' })}:{' '}
                      {formatDate(toDate(petition.requestedAt), language)}
                    </div>
                    {petition.reason ? (
                      <div className="mt-2 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                        {petition.reason}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
              <InboxArrowDownIcon className="h-4 w-4" />
              {t('ui.pastPetitions', { defaultValue: 'History' })}
            </h4>
            {petitionsByStatus.history.length === 0 ? (
              <EmptyState
                icon={<InboxArrowDownIcon className="h-10 w-10" aria-hidden="true" />}
                title={t('ui.noPastPetitions', { defaultValue: 'No past petitions' }) as string}
                description={
                  t('ui.noPastPetitionsDescription', {
                    defaultValue: 'Approved and rejected petitions will appear here.',
                  }) as string
                }
              />
            ) : (
              <ul className="space-y-3 text-sm">
                {petitionsByStatus.history.map((petition) => (
                  <li key={petition.id} className="rounded border border-muted/40 bg-bg p-3">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-foreground">
                        {rotationsById.get(petition.rotationId)?.name ||
                          t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                      </div>
                      <div className="text-xs uppercase tracking-wide text-muted-foreground">
                        {petition.status}
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {t('ui.submittedOn', { defaultValue: 'Submitted' })}:{' '}
                      {formatDate(toDate(petition.requestedAt), language)}
                    </div>
                    {petition.reason ? (
                      <div className="mt-2 rounded bg-muted/60 p-2 text-xs text-muted-foreground">
                        {petition.reason}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {error ? (
          <div className="rounded border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
            {error}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
