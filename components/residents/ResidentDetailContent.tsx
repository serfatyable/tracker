'use client';

import {
  AcademicCapIcon,
  ArrowTrendingUpIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationCircleIcon,
  InboxArrowDownIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import Spinner from '../ui/Spinner';

import { getResidentPalette } from './residentPalette';
import ResidentProfileHero from './ResidentProfileHero';

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
  const [approvingAll, setApprovingAll] = useState(false);
  const rotationsById = useMemo(() => new Map(rotations.map((r) => [r.id, r])), [rotations]);

  const palette = useMemo(
    () => getResidentPalette(entry?.activeRotation?.id || entry?.resident.uid),
    [entry?.activeRotation?.id, entry?.resident?.uid],
  );

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

  const handleApproveAll = useCallback(async () => {
    if (!pendingTasks.length) return;
    try {
      setApprovingAll(true);
      await updateTasksStatus({ taskIds: pendingTasks.map((task) => task.id), status: 'approved' });
      await refresh();
      if (onRefresh) await onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setApprovingAll(false);
    }
  }, [pendingTasks, refresh, onRefresh]);

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
  const programLabel = residentProfile?.studyprogramtype
    ? residentProfile.studyprogramtype === '6-year'
      ? t('ui.sixYearProgram', { defaultValue: '6-year program' })
      : t('ui.fourYearProgram', { defaultValue: '4-year program' })
    : null;

  const rotationDescription = nodesLoading
    ? t('ui.loading', { defaultValue: 'Loading' })
    : entry?.activeRotation
      ? t('ui.rotationRequirementsDescription', {
          defaultValue:
            'Progress is calculated based on approved tasks compared to required counts for this rotation.',
        })
      : t('ui.noActiveRotationDescription', {
          defaultValue: 'Assign a rotation to track progress for this resident.',
        });

  return (
    <div className="space-y-6">
      <ResidentProfileHero
        fullName={resident.fullName || resident.uid}
        email={resident.email}
        programLabel={programLabel}
        residencyStartLabel={formatDate(residencyStart, language)}
        residencyEndLabel={formatDate(residencyEnd, language)}
        activeRotationName={entry?.activeRotation?.name || null}
        tutorNames={entry?.tutorNames || []}
        palette={palette}
        rotationProgressPct={rotationStats.progressPct}
        pendingTasks={pendingTasks.length}
        onApproveAll={pendingTasks.length ? handleApproveAll : undefined}
        approvingAll={approvingAll}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          tone={palette.tone}
          variant="tinted"
          title={t('ui.rotationProgress', { defaultValue: 'Rotation progress' })}
          subtitle={
            entry?.activeRotation?.name ||
            t('ui.noActiveRotation', { defaultValue: 'No active rotation' })
          }
        >
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  label: t('ui.required', { defaultValue: 'Required' }),
                  value: rotationStats.required,
                  icon: <AcademicCapIcon className="h-5 w-5" aria-hidden="true" />,
                },
                {
                  label: t('ui.approved', { defaultValue: 'Approved' }),
                  value: rotationStats.approved,
                  icon: <CheckCircleIcon className="h-5 w-5" aria-hidden="true" />,
                },
                {
                  label: t('ui.pending', { defaultValue: 'Pending' }),
                  value: rotationStats.pending,
                  icon: <ClockIcon className="h-5 w-5" aria-hidden="true" />,
                },
              ].map((stat) => (
                <div
                  key={stat.label as string}
                  className="flex flex-col items-center rounded-2xl border border-white/30 bg-white/95 p-4 text-center shadow-sm backdrop-blur-sm transition dark:border-white/10 dark:bg-white/5"
                >
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-100">
                    {stat.icon}
                    {stat.label}
                  </div>
                  <div className="mt-2 text-2xl font-semibold leading-tight text-slate-900 dark:text-white">
                    {stat.value}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide opacity-70">
                <span>{t('ui.completion', { defaultValue: 'Completion' })}</span>
                <span>{rotationStats.progressPct}%</span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="h-full rounded-full bg-white/90 transition-all"
                  style={{ width: `${rotationStats.progressPct}%` }}
                  aria-hidden="true"
                />
              </div>
              <p className="text-xs opacity-75">{rotationDescription}</p>
            </div>
          </div>
        </Card>

        <Card
          tone="rose"
          variant="tinted"
          title={t('ui.taskApprovals', { defaultValue: 'Task approvals' })}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Spinner className="h-4 w-4" />
              {t('ui.loading', { defaultValue: 'Loading' })}
            </div>
          ) : pendingTasks.length === 0 ? (
            <div className="rounded-3xl border border-white/20 bg-white/40 p-6 text-center shadow-sm backdrop-blur-sm">
              <CheckCircleIcon className="mx-auto h-10 w-10 opacity-70" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">
                {t('ui.noPendingTasks', { defaultValue: 'No pending tasks' })}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {t('ui.noPendingTasksDescription', {
                  defaultValue: 'Great job! There are no pending approvals for this resident.',
                })}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {pendingTasks.map((task) => {
                const node = nodeById?.[task.itemId];
                return (
                  <li
                    key={task.id}
                    className="group relative overflow-hidden rounded-2xl border border-rose-500/25 bg-white/70 p-4 shadow-sm backdrop-blur-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold leading-5">
                          {node?.name || task.itemId || t('ui.task', { defaultValue: 'Task' })}
                        </div>
                        <div className="mt-1 text-xs opacity-70">
                          {t('ui.submittedOn', { defaultValue: 'Submitted' })}:{' '}
                          {formatDate(toDate(task.createdAt), language)}
                        </div>
                      </div>
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700">
                        {Number(task.count) || 0}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleTaskAction(task, 'approved')}
                        disabled={pendingAction === task.id}
                        className="rounded-full px-4"
                        leftIcon={
                          pendingAction === task.id ? (
                            <Spinner className="h-3 w-3" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4" aria-hidden="true" />
                          )
                        }
                      >
                        {t('ui.approve', { defaultValue: 'Approve' })}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleTaskAction(task, 'rejected')}
                        disabled={pendingAction === task.id}
                        className="rounded-full px-4"
                        leftIcon={
                          pendingAction === task.id ? <Spinner className="h-3 w-3" /> : undefined
                        }
                      >
                        {t('ui.reject', { defaultValue: 'Reject' })}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card
          tone="indigo"
          variant="tinted"
          className="text-indigo-900 dark:text-indigo-100"
          title={t('ui.activityTimeline', { defaultValue: 'Recent activity' })}
        >
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-indigo-900 dark:text-indigo-100">
              <Spinner className="h-4 w-4" />
              {t('ui.loading', { defaultValue: 'Loading' })}
            </div>
          ) : timeline.length === 0 ? (
            <div className="rounded-3xl border border-indigo-200/60 bg-white/95 p-6 text-center text-indigo-900 shadow-sm backdrop-blur-sm dark:border-indigo-300/20 dark:bg-indigo-950/40 dark:text-indigo-100">
              <InboxArrowDownIcon
                className="mx-auto h-10 w-10 text-indigo-500 dark:text-indigo-200"
                aria-hidden="true"
              />
              <p className="mt-3 text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                {t('ui.noRecentActivity', { defaultValue: 'No recent activity' })}
              </p>
              <p className="mt-1 text-xs text-indigo-600 dark:text-indigo-200/80">
                {t('ui.noRecentActivityDescription', {
                  defaultValue: 'New submissions, reflections, and tasks will appear here.',
                })}
              </p>
            </div>
          ) : (
            <ul className="space-y-4 text-indigo-900 dark:text-indigo-100">
              {timeline.map((task, index) => {
                const node = nodeById?.[task.itemId];
                const isLast = index === timeline.length - 1;
                return (
                  <li key={task.id} className="relative pl-10">
                    <span className="absolute left-0 top-0 flex h-full w-10 items-start justify-center">
                      <span className="relative flex h-6 w-6 items-center justify-center rounded-full bg-white text-indigo-600 shadow-md dark:bg-indigo-900/70 dark:text-indigo-100">
                        <ArrowTrendingUpIcon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      {!isLast ? (
                        <span
                          className="absolute left-1/2 top-6 -ml-px h-[calc(100%-1.5rem)] w-0.5 bg-indigo-200 dark:bg-indigo-500/40"
                          aria-hidden="true"
                        />
                      ) : null}
                    </span>
                    <div className="rounded-2xl border border-indigo-200/70 bg-white/95 p-4 text-indigo-900 shadow-sm transition dark:border-indigo-500/30 dark:bg-indigo-950/40 dark:text-indigo-100">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                        <span>
                          {node?.name || task.itemId || t('ui.task', { defaultValue: 'Task' })}
                        </span>
                        <span className="text-xs font-medium text-indigo-500 dark:text-indigo-200">
                          {formatDate(toDate(task.createdAt), language)}
                        </span>
                      </div>
                      <p className="mt-1 text-xs capitalize text-indigo-500 dark:text-indigo-200">
                        {task.status}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          tone="slate"
          variant="tinted"
          title={t('ui.rotationHistory', { defaultValue: 'Rotation history' })}
        >
          {entry?.assignments?.length ? (
            <ul className="space-y-3">
              {entry.assignments.map((assignment) => {
                const rotation = rotationsById.get(assignment.rotationId);
                const startDate = formatDate(toDate(assignment.startedAt), language);
                const endDate = formatDate(toDate(assignment.endedAt), language);
                return (
                  <li
                    key={`${assignment.rotationId}-${assignment.startedAt}`}
                    className="rounded-2xl border border-white/20 bg-white/15 p-4 shadow-sm backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                      <span>
                        {rotation?.name || t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                      </span>
                      <span
                        className={clsx(
                          'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide',
                          assignment.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-700'
                            : assignment.status === 'finished'
                              ? 'bg-sky-500/20 text-sky-700'
                              : 'bg-amber-500/20 text-amber-700',
                        )}
                      >
                        {assignment.status}
                      </span>
                    </div>
                    <div className="mt-1 text-xs opacity-70">
                      {startDate} — {endDate}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="rounded-3xl border border-white/20 bg-white/10 p-6 text-center shadow-sm backdrop-blur">
              <InboxArrowDownIcon className="mx-auto h-10 w-10 opacity-70" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold">
                {t('ui.noAssignments', { defaultValue: 'No assignments yet' })}
              </p>
              <p className="mt-1 text-xs opacity-70">
                {t('ui.noAssignmentsDescription', {
                  defaultValue: 'Assign rotations to begin tracking this resident’s progress.',
                })}
              </p>
            </div>
          )}
        </Card>

        <Card
          tone="amber"
          variant="tinted"
          title={t('ui.rotationPetitions', { defaultValue: 'Rotation petitions' })}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <ExclamationCircleIcon className="h-5 w-5" aria-hidden="true" />
                {t('ui.pendingPetitions', { defaultValue: 'Pending petitions' })}
              </h4>
              {petitionsByStatus.pendingList.length === 0 ? (
                <div className="rounded-3xl border border-amber-400/30 bg-white/60 p-5 text-sm shadow-sm">
                  <p className="font-semibold">
                    {t('ui.noPendingPetitions', { defaultValue: 'No pending petitions' })}
                  </p>
                  <p className="mt-1 text-xs opacity-75">
                    {t('ui.noPendingPetitionsDescription', {
                      defaultValue: 'Pending activation/finish requests will appear here.',
                    })}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3 text-sm">
                  {petitionsByStatus.pendingList.map((petition) => (
                    <li
                      key={petition.id}
                      className="rounded-2xl border border-amber-400/40 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">
                          {rotationsById.get(petition.rotationId)?.name ||
                            t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                        </div>
                        <span className="rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
                          {petition.type}
                        </span>
                      </div>
                      <div className="mt-1 text-xs opacity-75">
                        {t('ui.submittedOn', { defaultValue: 'Submitted' })}:{' '}
                        {formatDate(toDate(petition.requestedAt), language)}
                      </div>
                      {petition.reason ? (
                        <div className="mt-2 rounded-2xl bg-amber-500/10 p-3 text-xs opacity-80">
                          {petition.reason}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <InboxArrowDownIcon className="h-5 w-5" aria-hidden="true" />
                {t('ui.pastPetitions', { defaultValue: 'History' })}
              </h4>
              {petitionsByStatus.history.length === 0 ? (
                <div className="rounded-3xl border border-amber-400/30 bg-white/60 p-5 text-sm shadow-sm">
                  <p className="font-semibold">
                    {t('ui.noPastPetitions', { defaultValue: 'No past petitions' })}
                  </p>
                  <p className="mt-1 text-xs opacity-75">
                    {t('ui.noPastPetitionsDescription', {
                      defaultValue: 'Approved and rejected petitions will appear here.',
                    })}
                  </p>
                </div>
              ) : (
                <ul className="space-y-3 text-sm">
                  {petitionsByStatus.history.map((petition) => (
                    <li
                      key={petition.id}
                      className="rounded-2xl border border-amber-400/40 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-semibold">
                          {rotationsById.get(petition.rotationId)?.name ||
                            t('ui.unknownRotation', { defaultValue: 'Rotation' })}
                        </div>
                        <span className="rounded-full bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900">
                          {petition.status}
                        </span>
                      </div>
                      <div className="mt-1 text-xs opacity-75">
                        {t('ui.submittedOn', { defaultValue: 'Submitted' })}:{' '}
                        {formatDate(toDate(petition.requestedAt), language)}
                      </div>
                      {petition.reason ? (
                        <div className="mt-2 rounded-2xl bg-amber-500/10 p-3 text-xs opacity-80">
                          {petition.reason}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-900 dark:text-rose-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
