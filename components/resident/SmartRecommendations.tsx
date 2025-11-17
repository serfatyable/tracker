'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { ListSkeleton } from '@/components/dashboard/Skeleton';
import Button from '@/components/ui/Button';
import EmptyState, { SparklesIcon } from '@/components/ui/EmptyState';
import { useResidentActiveRotation } from '@/lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '@/lib/hooks/useRotationNodes';
import { useUserTasks } from '@/lib/hooks/useUserTasks';

type Recommendation = {
  id: string;
  type: 'almost-complete' | 'rejected' | 'new-feedback' | 'suggested';
  title: string;
  description: string;
  action: string;
  actionLink: string;
  priority: number;
  icon: string;
};

export default function SmartRecommendations() {
  const { t } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const { nodes, loading: nodesLoading } = useRotationNodes(rotationId || null);
  const { tasks, loading: tasksLoading } = useUserTasks();

  const recommendations = useMemo(() => {
    if (!rotationId || !nodes.length) return [];

    const recs: Recommendation[] = [];
    const nodesMap = new Map(nodes.map((n) => [n.id, n]));

    // 1. Find tasks that are almost complete (e.g., 2/3 done)
    const tasksByItem = new Map<string, typeof tasks>();
    tasks.forEach((task) => {
      if (task.rotationId === rotationId && task.status === 'approved') {
        const existing = tasksByItem.get(task.itemId) || [];
        tasksByItem.set(task.itemId, [...existing, task]);
      }
    });

    tasksByItem.forEach((itemTasks, itemId) => {
      const node = nodesMap.get(itemId);
      if (!node || node.type !== 'leaf') return;

      const approvedCount = itemTasks.reduce((sum, t) => sum + (Number(t.count) || 0), 0);
      const requiredCount = Number((node as any).requiredCount) || 0;

      if (requiredCount > 0 && approvedCount > 0 && approvedCount < requiredCount) {
        const percentage = Math.round((approvedCount / requiredCount) * 100);
        if (percentage >= 50) {
          // At least 50% complete
          recs.push({
            id: `almost-${itemId}`,
            type: 'almost-complete',
            title: node.name,
            description: t('ui.home.recommendation.almostComplete', {
              current: approvedCount,
              required: requiredCount,
              defaultValue: '{{current}}/{{required}} completed - Almost there!',
            }),
            action: t('ui.home.recommendation.logMore', { defaultValue: 'Log More' }) as string,
            actionLink: `/resident/rotations?selected=${itemId}`,
            priority: percentage,
            icon: '🎯',
          });
        }
      }
    });

    // 2. Find rejected tasks that need reflection
    const rejectedTasks = tasks.filter(
      (t) => t.rotationId === rotationId && t.status === 'rejected',
    );

    rejectedTasks.slice(0, 2).forEach((task) => {
      const node = nodesMap.get(task.itemId);
      if (!node) return;

      recs.push({
        id: `rejected-${task.id}`,
        type: 'rejected',
        title: node.name,
        description: t('ui.home.recommendation.rejectedTask', {
          defaultValue: 'Review feedback and resubmit',
        }),
        action: t('ui.home.recommendation.reflect', { defaultValue: 'Reflect' }) as string,
        actionLink: `/resident/reflections/${task.id}?taskType=${encodeURIComponent(node.name)}`,
        priority: 100, // High priority
        icon: '🔄',
      });
    });

    // 3. Find tasks with new feedback
    const tasksWithFeedback = tasks.filter(
      (t) =>
        t.rotationId === rotationId &&
        t.status === 'approved' &&
        t.feedback &&
        Array.isArray(t.feedback) &&
        t.feedback.length > 0 &&
        t.feedback.some((f) => f.text && f.text.trim().length > 0),
    );

    tasksWithFeedback.slice(0, 1).forEach((task) => {
      const node = nodesMap.get(task.itemId);
      if (!node) return;

      recs.push({
        id: `feedback-${task.id}`,
        type: 'new-feedback',
        title: node.name,
        description: t('ui.home.recommendation.newFeedback', {
          defaultValue: 'New tutor feedback available',
        }),
        action: t('ui.home.recommendation.viewFeedback', { defaultValue: 'View Feedback' }) as string,
        actionLink: `/resident/reflections/${task.id}?taskType=${encodeURIComponent(node.name)}`,
        priority: 80,
        icon: '💬',
      });
    });

    // 4. Suggest tasks with 0 progress in active rotation
    const leafNodes = nodes.filter(
      (n) => n.rotationId === rotationId && n.type === 'leaf',
    ) as any[];

    const unStartedTasks = leafNodes.filter((node) => {
      const hasAnyTask = tasks.some((t) => t.itemId === node.id);
      return !hasAnyTask && node.requiredCount > 0;
    });

    unStartedTasks.slice(0, 2).forEach((node) => {
      recs.push({
        id: `suggested-${node.id}`,
        type: 'suggested',
        title: node.name,
        description: t('ui.home.recommendation.notStarted', {
          required: node.requiredCount,
          defaultValue: '{{required}} required - Get started!',
        }),
        action: t('ui.home.recommendation.startNow', { defaultValue: 'Start Now' }) as string,
        actionLink: `/resident/rotations?selected=${node.id}`,
        priority: 40,
        icon: '🚀',
      });
    });

    // Sort by priority (highest first) and limit to top 5
    return recs.sort((a, b) => b.priority - a.priority).slice(0, 5);
  }, [rotationId, nodes, tasks, t]);

  if (nodesLoading || tasksLoading) {
    return (
      <div className="card-levitate rounded-xl border p-5">
        <ListSkeleton items={3} />
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="card-levitate overflow-hidden rounded-xl border border-gray-200/60 bg-white p-5 shadow-sm dark:border-gray-700/40 dark:bg-gray-900/50">
        <h3 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          🎯 {t('ui.home.suggestedNextSteps', { defaultValue: 'Suggested Next Steps' })}
        </h3>
        <EmptyState
          icon={<SparklesIcon />}
          title={t('ui.home.noRecommendations', { defaultValue: 'All caught up!' })}
          description={t('ui.home.noRecommendationsDesc', {
            defaultValue: "You're doing great. Keep up the good work!",
          })}
        />
      </div>
    );
  }

  return (
    <div className="card-levitate overflow-hidden rounded-xl border border-purple-200/60 bg-gradient-to-br from-purple-50/50 to-pink-50/50 p-5 shadow-sm dark:border-purple-900/40 dark:from-purple-950/20 dark:to-pink-950/20">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        🎯 {t('ui.home.suggestedNextSteps', { defaultValue: 'Suggested Next Steps' })}
      </h3>

      <div className="space-y-3">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="group flex items-start justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all hover:border-purple-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/50 dark:hover:border-purple-700"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100 text-xl dark:bg-purple-900/50">
                {rec.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{rec.title}</div>
                <div className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                  {rec.description}
                </div>
              </div>
            </div>
            <Link href={rec.actionLink}>
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900/30"
              >
                {rec.action}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
