'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useResidentActiveRotation } from '@/lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '@/lib/hooks/useRotationNodes';
import { useUserTasks } from '@/lib/hooks/useUserTasks';
import { ListSkeleton } from '@/components/dashboard/Skeleton';

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  unlocked: boolean;
};

type Insight = {
  id: string;
  category: string;
  value: number;
  label: string;
  icon: string;
};

export default function AchievementsInsights() {
  const { t } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const { nodes, loading: nodesLoading } = useRotationNodes(rotationId || null);
  const { tasks, loading: tasksLoading } = useUserTasks();

  const { achievements, insights, weeklySummary } = useMemo(() => {
    const achievements: Achievement[] = [];
    const insights: Insight[] = [];

    if (!rotationId || !tasks.length) {
      return { achievements: [], insights: [], weeklySummary: null };
    }

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Calculate weekly summary
    const tasksThisWeek = tasks.filter((t) => {
      const taskTime = (t.createdAt as any)?.toMillis?.() || 0;
      return taskTime >= oneWeekAgo;
    });

    const approvedThisWeek = tasksThisWeek.filter((t) => t.status === 'approved').length;
    const totalActivitiesThisWeek = tasksThisWeek.reduce(
      (sum, t) => sum + (Number(t.count) || 0),
      0,
    );

    const weeklySummary = {
      tasksCompleted: approvedThisWeek,
      activitiesLogged: totalActivitiesThisWeek,
    };

    // Define achievements
    const allAchievements: Achievement[] = [
      {
        id: 'first-task',
        title: t('ui.home.achievements.firstTask', { defaultValue: 'First Steps' }) as string,
        description: t('ui.home.achievements.firstTaskDesc', {
          defaultValue: 'Completed your first task',
        }) as string,
        icon: '🎯',
        color: 'from-blue-500 to-sky-500',
        unlocked: tasks.some((t) => t.status === 'approved'),
      },
      {
        id: 'week-streak',
        title: t('ui.home.achievements.weekStreak', { defaultValue: 'Week Warrior' }) as string,
        description: t('ui.home.achievements.weekStreakDesc', {
          defaultValue: '7-day activity streak',
        }) as string,
        icon: '🔥',
        color: 'from-orange-500 to-red-500',
        unlocked: false, // Would need streak calculation
      },
      {
        id: 'ten-approved',
        title: t('ui.home.achievements.tenApproved', { defaultValue: 'Making Progress' }) as string,
        description: t('ui.home.achievements.tenApprovedDesc', {
          defaultValue: '10 tasks approved',
        }) as string,
        icon: '⭐',
        color: 'from-amber-500 to-yellow-500',
        unlocked: tasks.filter((t) => t.status === 'approved').length >= 10,
      },
      {
        id: 'fifty-approved',
        title: t('ui.home.achievements.fiftyApproved', { defaultValue: 'Expert Learner' }) as string,
        description: t('ui.home.achievements.fiftyApprovedDesc', {
          defaultValue: '50 tasks approved',
        }) as string,
        icon: '🏆',
        color: 'from-purple-500 to-pink-500',
        unlocked: tasks.filter((t) => t.status === 'approved').length >= 50,
      },
      {
        id: 'rotation-complete',
        title: t('ui.home.achievements.rotationComplete', {
          defaultValue: 'Rotation Master',
        }) as string,
        description: t('ui.home.achievements.rotationCompleteDesc', {
          defaultValue: 'Completed all required tasks in a rotation',
        }) as string,
        icon: '🎓',
        color: 'from-teal-500 to-emerald-500',
        unlocked: false, // Would need rotation completion check
      },
    ];

    achievements.push(...allAchievements.filter((a) => a.unlocked).slice(0, 3));

    // Calculate category insights (Knowledge, Skills, Guidance)
    const nodesMap = new Map(nodes.map((n) => [n.id, n]));
    const categoryStats = new Map<string, number>();

    tasks
      .filter((t) => t.status === 'approved')
      .forEach((task) => {
        const node = nodesMap.get(task.itemId);
        if (!node) return;

        // Walk up to find category
        let current: any = node;
        while (current && current.type !== 'category') {
          current = current.parentId ? nodesMap.get(current.parentId) : null;
        }

        if (current && current.type === 'category') {
          const category = current.name;
          categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
        }
      });

    const categoryIcons: Record<string, string> = {
      Knowledge: '📚',
      Skills: '🔧',
      Guidance: '🧭',
    };

    categoryStats.forEach((count, category) => {
      insights.push({
        id: `category-${category}`,
        category,
        value: count,
        label: t(`ui.category.${category.toLowerCase()}`, { defaultValue: category }) as string,
        icon: categoryIcons[category] || '📊',
      });
    });

    return { achievements, insights, weeklySummary };
  }, [tasks, rotationId, nodes, t]);

  if (nodesLoading || tasksLoading) {
    return (
      <div className="card-levitate rounded-xl border p-5">
        <ListSkeleton items={3} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Weekly Summary */}
      {weeklySummary && (
        <div className="card-levitate overflow-hidden rounded-xl border border-teal-200/60 bg-gradient-to-br from-teal-50/50 to-emerald-50/50 p-5 shadow-sm dark:border-teal-900/40 dark:from-teal-950/20 dark:to-emerald-950/20">
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
            📊 {t('ui.home.weeklySummary', { defaultValue: 'This Week' })}
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">✅</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('ui.home.tasksCompleted', { defaultValue: 'Tasks Completed' })}
                </span>
              </div>
              <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {weeklySummary.tasksCompleted}
              </span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-white p-3 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📝</span>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {t('ui.home.activitiesLogged', { defaultValue: 'Activities Logged' })}
                </span>
              </div>
              <span className="text-2xl font-bold text-teal-600 dark:text-teal-400">
                {weeklySummary.activitiesLogged}
              </span>
            </div>

            {/* Category breakdown */}
            {insights.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('ui.home.strengthAreas', { defaultValue: 'Strength Areas' })}
                </div>
                <div className="space-y-2">
                  {insights.map((insight) => (
                    <div
                      key={insight.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span>{insight.icon}</span>
                        <span>{insight.label}</span>
                      </span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {insight.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="card-levitate overflow-hidden rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50/50 to-orange-50/50 p-5 shadow-sm dark:border-amber-900/40 dark:from-amber-950/20 dark:to-orange-950/20">
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
          🏆 {t('ui.home.recentAchievements', { defaultValue: 'Recent Achievements' })}
        </h3>
        {achievements.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-600 dark:text-gray-400">
            {t('ui.home.noAchievementsYet', {
              defaultValue: 'Complete tasks to unlock achievements!',
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className="group relative overflow-hidden rounded-lg border border-amber-200 bg-white p-3 dark:border-amber-800 dark:bg-gray-800/50"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${achievement.color} text-2xl shadow-sm`}
                  >
                    {achievement.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">
                      {achievement.title}
                    </div>
                    <div className="mt-0.5 text-xs text-gray-600 dark:text-gray-400">
                      {achievement.description}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
