'use client';
import { HandRaisedIcon, FireIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { useResidentActiveRotation } from '@/lib/hooks/useResidentActiveRotation';
import { useRotations } from '@/lib/react-query/hooks';
import { useUserTasks } from '@/lib/react-query/hooks';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

export default function WelcomeHero() {
  const { t, i18n } = useTranslation();
  const { data: userProfile } = useCurrentUserProfile();
  const { rotationId } = useResidentActiveRotation();
  const { rotations } = useRotations();
  const { tasks } = useUserTasks();
  const router = useRouter();

  const currentRotation = useMemo(() => {
    return rotations.find((r) => r.id === rotationId);
  }, [rotations, rotationId]);

  const { streak, completionPercentage, resumeTask, overdueTasks } = useMemo(() => {
    if (!tasks.length) return { streak: 0, completionPercentage: 0 };

    // Calculate streak (consecutive days with at least one task)
    const sortedTasks = [...tasks].sort((a, b) => {
      const aTime = (a.createdAt as any)?.toMillis?.() || 0;
      const bTime = (b.createdAt as any)?.toMillis?.() || 0;
      return bTime - aTime;
    });

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      if (!task) continue;

      const taskTime = (task.createdAt as any)?.toMillis?.() || 0;
      const taskDate = new Date(taskTime);
      taskDate.setHours(0, 0, 0, 0);

      const diffDays = Math.floor(
        (currentDate.getTime() - taskDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (diffDays === streak) {
        streak++;
      } else if (diffDays > streak) {
        break;
      }
    }

    // Calculate rotation completion percentage
    const rotationTasks = tasks.filter((t) => t.rotationId === rotationId);
    const approvedCount = rotationTasks.filter((t) => t.status === 'approved').length;
    const totalCount = rotationTasks.length || 1;
    const completionPercentage = Math.round((approvedCount / totalCount) * 100);

    const resumeTask = rotationTasks
      .filter((t) => t.status === 'pending')
      .sort((a, b) => getTaskTimestamp(b) - getTaskTimestamp(a))[0];

    const overdueTasks = rotationTasks.filter((task) => {
      if (task.status !== 'pending') return false;
      const created = getTaskTimestamp(task);
      return Date.now() - created > 1000 * 60 * 60 * 24 * 7; // older than a week
    });

    return { streak, completionPercentage, resumeTask, overdueTasks };
  }, [tasks, rotationId]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('ui.home.greeting.morning', { defaultValue: 'Good morning' });
    if (hour < 18) return t('ui.home.greeting.afternoon', { defaultValue: 'Good afternoon' });
    return t('ui.home.greeting.evening', { defaultValue: 'Good evening' });
  }, [t]);

  const userName = userProfile?.fullName?.split(' ')[0] || t('ui.resident', 'Resident');

  const motivationalQuotes = [
    t('ui.home.quote1', {
      defaultValue: 'Excellence is a continuous process, not an accident.',
    }),
    t('ui.home.quote2', { defaultValue: 'Every expert was once a beginner.' }),
    t('ui.home.quote3', { defaultValue: 'Learning is a journey, not a destination.' }),
    t('ui.home.quote4', { defaultValue: 'Progress, not perfection.' }),
    t('ui.home.quote5', { defaultValue: 'Small steps lead to great achievements.' }),
  ];

  const quote = useMemo(() => {
    const index = new Date().getDate() % motivationalQuotes.length;
    return motivationalQuotes[index];
  }, [motivationalQuotes]);

  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference;

  const handleResume = useCallback(() => {
    if (!resumeTask) return;
    router.push(`/resident/reflections/${resumeTask.id}`);
  }, [resumeTask, router]);

  const handleOpenRotation = useCallback(() => {
    if (rotationId) {
      router.push(`/resident/rotations?selected=${rotationId}`);
    } else {
      router.push('/resident/rotations');
    }
  }, [router, rotationId]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-6 shadow-lg dark:border-sky-900/40 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-950/30">
      {/* Decorative background elements */}
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-sky-200/30 to-indigo-200/30 blur-3xl dark:from-sky-800/20 dark:to-indigo-800/20" />
      <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-3xl dark:from-blue-800/20 dark:to-purple-800/20" />

      <div className="relative z-10">
        {/* Greeting and Name */}
        <div className="mb-4">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {greeting}, {userName}!
            <HandRaisedIcon className="h-7 w-7 text-amber-500 dark:text-amber-400" aria-hidden="true" />
          </h1>
          <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">{quote}</p>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Progress Circle */}
          {currentRotation && (
            <button
              type="button"
              onClick={handleOpenRotation}
              className="flex items-center gap-3 rounded-xl bg-white/70 px-3 py-2 transition hover:shadow-md dark:bg-white/10"
            >
              <div className="relative h-20 w-20">
                <svg className="h-20 w-20 -rotate-90 transform" role="presentation">
                  {/* Background circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    className="text-gray-200 dark:text-gray-700"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="40"
                    cy="40"
                    r="35"
                    stroke="currentColor"
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    className="text-teal-500 transition-all duration-500 ease-in-out dark:text-teal-400"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {completionPercentage}%
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {i18n.language === 'he' && currentRotation.name_he
                    ? currentRotation.name_he
                    : currentRotation.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('ui.home.rotationProgress', { defaultValue: 'Rotation Progress' })}
                </div>
                {overdueTasks?.length ? (
                  <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                    {t('ui.home.overdueCount', {
                      defaultValue: '{{count}} overdue reflections',
                      count: overdueTasks.length,
                    })}
                  </p>
                ) : null}
              </div>
            </button>
          )}

          {/* Streak Badge */}
          {streak > 0 && (
            <Link
              href="/resident/reflections"
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 transition hover:shadow-md dark:from-amber-900/30 dark:to-orange-900/30"
            >
              <FireIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
              <div>
                <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                  {streak} {t('ui.home.dayStreak', { defaultValue: 'day streak' })}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-400">
                  {t('ui.home.keepGoing', { defaultValue: 'Keep going!' })}
                </div>
              </div>
            </Link>
          )}

          {/* Current Rotation Badge */}
          {!currentRotation && (
            <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 dark:bg-gray-800">
              <span className="text-xl">📚</span>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('ui.home.noActiveRotation', { defaultValue: 'No active rotation' })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            size="md"
            onClick={handleResume}
            disabled={!resumeTask}
            leftIcon={<span aria-hidden="true">✨</span>}
          >
            {resumeTask
              ? t('ui.home.resumeTask', { defaultValue: 'Resume latest reflection' })
              : t('ui.home.startTask', { defaultValue: 'Log a new reflection' })}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleOpenRotation}>
            {t('ui.home.viewRotationBoard', { defaultValue: 'View rotation board' })}
          </Button>
          {overdueTasks?.length ? (
            <Badge variant="warning" size="sm">
              {t('ui.home.overdueBadge', { defaultValue: '{{count}} overdue', count: overdueTasks.length })}
            </Badge>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function getTaskTimestamp(task: any): number {
  const value = task?.createdAt as any;
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toMillis === 'function') {
    try {
      return value.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof value.seconds === 'number') {
    const nanos = typeof value.nanoseconds === 'number' ? value.nanoseconds / 1_000_000 : 0;
    return value.seconds * 1000 + nanos;
  }
  return 0;
}
