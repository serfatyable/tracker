'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { useResidentActiveRotation } from '@/lib/hooks/useResidentActiveRotation';
import { useRotations } from '@/lib/hooks/useRotations';
import { useUserTasks } from '@/lib/hooks/useUserTasks';

export default function WelcomeHero() {
  const { t, i18n } = useTranslation();
  const { data: userProfile } = useCurrentUserProfile();
  const { rotationId } = useResidentActiveRotation();
  const { rotations } = useRotations();
  const { tasks } = useUserTasks();

  const currentRotation = useMemo(() => {
    return rotations.find((r) => r.id === rotationId);
  }, [rotations, rotationId]);

  const { streak, completionPercentage } = useMemo(() => {
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
      const taskTime = (sortedTasks[i].createdAt as any)?.toMillis?.() || 0;
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

    return { streak, completionPercentage };
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

  return (
    <div className="relative overflow-hidden rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-6 shadow-lg dark:border-sky-900/40 dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-950/30">
      {/* Decorative background elements */}
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-gradient-to-br from-sky-200/30 to-indigo-200/30 blur-3xl dark:from-sky-800/20 dark:to-indigo-800/20" />
      <div className="absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-gradient-to-br from-blue-200/30 to-purple-200/30 blur-3xl dark:from-blue-800/20 dark:to-purple-800/20" />

      <div className="relative z-10">
        {/* Greeting and Name */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            {greeting}, {userName}! 👋
          </h1>
          <p className="mt-1 text-sm italic text-gray-600 dark:text-gray-400">{quote}</p>
        </div>

        {/* Stats Row */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          {/* Progress Circle */}
          {currentRotation && (
            <div className="flex items-center gap-3">
              <div className="relative h-20 w-20">
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
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {i18n.language === 'he' ? currentRotation.nameHe : currentRotation.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  {t('ui.home.rotationProgress', { defaultValue: 'Rotation Progress' })}
                </div>
              </div>
            </div>
          )}

          {/* Streak Badge */}
          {streak > 0 && (
            <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-100 to-orange-100 px-4 py-2 dark:from-amber-900/30 dark:to-orange-900/30">
              <span className="text-2xl">🔥</span>
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
  );
}
