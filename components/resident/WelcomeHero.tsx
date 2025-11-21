'use client';
import { HandRaisedIcon, FireIcon } from '@heroicons/react/24/solid';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { useResidentActiveRotation } from '@/lib/hooks/useResidentActiveRotation';
import { useResidentProgress } from '@/lib/hooks/useResidentProgress';
import { useRotationNodes } from '@/lib/hooks/useRotationNodes';
import { useRotations } from '@/lib/react-query/hooks';
import { useUserTasks } from '@/lib/react-query/hooks';

type CategoryKey = 'knowledge' | 'skills' | 'guidance';

type CategoryProgress = {
  key: CategoryKey;
  label: string;
  percent: number;
  approved: number;
  required: number;
};

export default function WelcomeHero() {
  const { t, i18n } = useTranslation();
  const { data: userProfile } = useCurrentUserProfile();
  const { rotationId } = useResidentActiveRotation();
  const { rotations } = useRotations();
  const { tasks } = useUserTasks();
  const { nodes } = useRotationNodes(rotationId || null);
  const { roots, totals } = useResidentProgress(rotationId || null, tasks, nodes);

  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  const currentRotation = useMemo(() => {
    return rotations.find((r) => r.id === rotationId);
  }, [rotations, rotationId]);

  const streak = useMemo(() => {
    if (!tasks.length) return 0;

    // Calculate streak (consecutive days with at least one task)
    const sortedTasks = [...tasks].sort((a, b) => {
      const aCreated = a.createdAt as any;
      const bCreated = b.createdAt as any;
      const aTime =
        aCreated instanceof Date
          ? aCreated.getTime()
          : typeof aCreated?.toMillis === 'function'
            ? aCreated.toMillis()
            : typeof aCreated === 'number'
              ? aCreated
              : typeof aCreated === 'string'
                ? Date.parse(aCreated) || 0
                : 0;
      const bTime =
        bCreated instanceof Date
          ? bCreated.getTime()
          : typeof bCreated?.toMillis === 'function'
            ? bCreated.toMillis()
            : typeof bCreated === 'number'
              ? bCreated
              : typeof bCreated === 'string'
                ? Date.parse(bCreated) || 0
                : 0;
      return bTime - aTime;
    });

    let streak = 0;
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    for (let i = 0; i < sortedTasks.length; i++) {
      const task = sortedTasks[i];
      if (!task) continue;

      const created = task.createdAt as any;
      let taskTime = 0;

      if (created instanceof Date) {
        taskTime = created.getTime();
      } else if (created && typeof created.toMillis === 'function') {
        try {
          taskTime = created.toMillis();
        } catch {
          taskTime = 0;
        }
      } else if (typeof created === 'number') {
        taskTime = created;
      } else if (typeof created === 'string') {
        const parsed = Date.parse(created);
        taskTime = Number.isNaN(parsed) ? 0 : parsed;
      }
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

    return streak;
  }, [tasks]);

  // Calculate rotation completion percentage based on required tasks in the active rotation
  const completionPercentage = totals.percent;

  const categoryProgress: CategoryProgress[] = useMemo(() => {
    if (!roots.length) return [];

    const aggregates: Record<CategoryKey, { approved: number; required: number }> = {
      knowledge: { approved: 0, required: 0 },
      skills: { approved: 0, required: 0 },
      guidance: { approved: 0, required: 0 },
    };

    roots.forEach((root) => {
      if (root.type !== 'category') return;
      const name = (root.name || '').toLowerCase();

      let key: CategoryKey | null = null;
      if (name.includes('knowledge') || name.includes('ידע')) {
        key = 'knowledge';
      } else if (name.includes('skill') || name.includes('מיומנויות')) {
        key = 'skills';
      } else if (name.includes('guidance') || name.includes('הנחיות') || name.includes('הדרכה')) {
        key = 'guidance';
      }

      if (!key) return;

      aggregates[key].approved += root.approvedCount;
      aggregates[key].required += root.requiredCount;
    });

    const orderedKeys: CategoryKey[] = ['skills', 'knowledge', 'guidance'];

    return orderedKeys
      .map((key) => {
        const { approved, required } = aggregates[key];
        if (!required) {
          // Per spec: hide categories with no data rather than showing 0%
          return null;
        }
        const percent =
          required > 0 ? Math.min(100, Math.round((approved / required) * 100)) : 0;
        const label =
          key === 'knowledge'
            ? (t('ui.knowledge', { defaultValue: 'Knowledge' }) as string)
            : key === 'skills'
              ? (t('ui.skills', { defaultValue: 'Skills' }) as string)
              : (t('ui.guidance', { defaultValue: 'Guidance' }) as string);
        return { key, label, percent, approved, required } as CategoryProgress;
      })
      .filter(Boolean) as CategoryProgress[];
  }, [roots, t]);

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

  const rotationDisplayName =
    currentRotation &&
    (i18n.language === 'he' && (currentRotation as any).name_he
      ? (currentRotation as any).name_he
      : currentRotation.name);

  return (
    <>
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
          <div className="flex flex-wrap items-start gap-4 sm:gap-6">
            {/* Progress Circle + Category breakdown */}
            {currentRotation && (
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 flex-shrink-0">
                  <svg className="h-20 w-20 -rotate-90 transform">
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
                <div className="space-y-2">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {rotationDisplayName}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {t('ui.home.rotationProgress', { defaultValue: 'Rotation Progress' })}
                    </div>
                  </div>

                  {categoryProgress.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCategoryDetails(true)}
                      className="group mt-1 flex items-center gap-3 rounded-lg bg-white/40 px-2 py-1 text-left shadow-sm ring-1 ring-sky-100 transition hover:bg-white/80 hover:shadow-md hover:ring-sky-200 dark:bg-slate-900/40 dark:ring-sky-800/60 dark:hover:bg-slate-900/70 dark:hover:ring-sky-500/80"
                      aria-label={t('ui.home.viewCategoryProgress', {
                        defaultValue: 'View progress by category',
                      }) as string}
                    >
                      <div className="mr-1 flex items-center gap-3">
                        {categoryProgress.map((cat) => (
                          <CategoryMiniRing
                            key={cat.key}
                            percent={cat.percent}
                            label={cat.label}
                            colorClass={
                              cat.key === 'knowledge'
                                ? 'text-sky-500 dark:text-sky-400'
                                : cat.key === 'skills'
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-purple-500 dark:text-purple-400'
                            }
                          />
                        ))}
                      </div>
                      <div className="ml-auto flex items-center gap-1 text-xs font-medium text-sky-700 group-hover:text-sky-900 dark:text-sky-300 dark:group-hover:text-sky-100">
                        <span>
                          {t('ui.home.byCategory', { defaultValue: 'By category' }) as string}
                        </span>
                        <span aria-hidden="true">›</span>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Streak Badge */}
            {streak > 0 && (
              <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 dark:from-amber-900/30 dark:to-orange-900/30">
                <FireIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" aria-hidden="true" />
                <div>
                  <div className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    {streak} {t('ui.home.dayStreak', { defaultValue: 'day streak' })}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    {t('ui.home.keepGoing', { defaultValue: 'Keep going!' })}
                  </div>
                </div>
              </div>
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
        </div>
      </div>

      {currentRotation && categoryProgress.length > 0 && (
        <CategoryProgressSheet
          open={showCategoryDetails}
          onClose={() => setShowCategoryDetails(false)}
          rotationName={rotationDisplayName || currentRotation.name}
          overallPercent={completionPercentage}
          categories={categoryProgress}
        />
      )}
    </>
  );
}

function CategoryMiniRing({
  percent,
  label,
  colorClass,
}: {
  percent: number;
  label: string;
  colorClass: string;
}) {
  const size = 44;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference - (clamped / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-11 w-11">
        <svg
          className={`h-11 w-11 -rotate-90 transform ${colorClass}`}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            stroke="currentColor"
            className="text-gray-200 dark:text-gray-700"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            stroke="currentColor"
            className={colorClass}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-gray-900 dark:text-white">
            {clamped}%
          </span>
        </div>
      </div>
      <span className="text-[11px] font-medium text-gray-700 dark:text-gray-300">{label}</span>
    </div>
  );
}

function CategoryProgressSheet({
  open,
  onClose,
  rotationName,
  overallPercent,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  rotationName: string;
  overallPercent: number;
  categories: CategoryProgress[];
}) {
  const { t } = useTranslation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        className="h-full w-full bg-black/40"
        onClick={onClose}
        aria-label={t('ui.close', { defaultValue: 'Close' }) as string}
      />
      <div className="max-h-[70%] w-full rounded-t-2xl bg-white p-4 shadow-lg dark:bg-[rgb(var(--surface))]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
              {t('ui.rotationProgressTitle', { defaultValue: 'Rotation progress' })}
            </div>
            <div className="mt-0.5 text-xs text-gray-600 dark:text-[rgb(var(--muted))]">
              {t('ui.rotationProgressByCategorySubtitle', {
                defaultValue: 'By category · {{rotationName}}',
                rotationName,
              })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-500 shadow-sm hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:bg-[rgb(var(--surface-elevated))] dark:text-[rgb(var(--muted))] dark:hover:bg-[rgb(var(--surface-elevated))]/80"
            aria-label={t('ui.close', { defaultValue: 'Close' }) as string}
          >
            ✕
          </button>
        </div>

        <div className="mb-3 text-xs text-gray-600 dark:text-[rgb(var(--muted))]">
          {t('ui.rotationProgressOverallSummary', {
            defaultValue: 'Overall: {{percent}}% complete',
            percent: overallPercent,
          })}
        </div>

        {categories.length === 0 ? (
          <div className="py-6 text-sm text-gray-500 dark:text-[rgb(var(--muted))]">
            {t('ui.rotationProgressNoCategories', {
              defaultValue: 'Category-level details are not available for this rotation yet.',
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {categories.map((cat) => (
              <div
                key={cat.key}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface-elevated))]"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {cat.label}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {cat.percent}%
                  </div>
                </div>
                {cat.required > 0 && (
                  <div className="mt-1 text-xs text-gray-600 dark:text-[rgb(var(--muted))]">
                    {t('ui.rotationProgressCategoryCounts', {
                      defaultValue: '{{approved}} of {{required}} completed',
                      approved: cat.approved,
                      required: cat.required,
                    })}
                  </div>
                )}
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[rgb(var(--surface-depressed))]">
                  <div
                    className={`h-2 rounded-full ${
                      cat.key === 'knowledge'
                        ? 'bg-sky-500'
                        : cat.key === 'skills'
                          ? 'bg-emerald-500'
                          : 'bg-purple-500'
                    }`}
                    style={{ width: `${cat.percent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

