'use client';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useResidentProgress } from '../../lib/hooks/useResidentProgress';
import type { NodeProgress } from '../../lib/hooks/useResidentProgress';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { getLocalized } from '../../lib/i18n/getLocalized';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Card from '../ui/Card';

type ViewMode = 'overview' | 'categories' | 'focus' | 'timeline';

interface ProgressAnalytics {
  bestCategory: { id: string; name: string; percentage: number } | null;
  needsAttention: Array<{ id: string; name: string; progress: number }>;
  nearlyComplete: Array<{ id: string; name: string; progress: number }>;
  notStarted: Array<{ id: string; name: string }>;
  recentApprovals: number;
  completionRate: number;
  daysRemaining: number | null;
}

function analyzeProgress(roots: NodeProgress[], tasks: any[]): ProgressAnalytics {
  const allLeaves: NodeProgress[] = [];

  // Traverse tree to collect all leaf nodes
  function traverse(node: NodeProgress) {
    if (node.children.length === 0) {
      allLeaves.push(node);
    } else {
      node.children.forEach(traverse);
    }
  }

  roots.forEach(traverse);

  // Calculate category progress
  const categoryProgress = roots
    .map((root) => ({
      id: root.id,
      name: root.name,
      percentage:
        root.requiredCount > 0 ? Math.round((root.approvedCount / root.requiredCount) * 100) : 0,
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Find best category
  const bestCategory = categoryProgress.length > 0 ? categoryProgress[0] : null;

  // Analyze leaves
  const needsAttention = allLeaves
    .filter((leaf) => {
      const progress = leaf.requiredCount > 0 ? (leaf.approvedCount / leaf.requiredCount) * 100 : 0;
      return progress > 0 && progress < 50;
    })
    .map((leaf) => ({
      id: leaf.id,
      name: leaf.name,
      progress:
        leaf.requiredCount > 0 ? Math.round((leaf.approvedCount / leaf.requiredCount) * 100) : 0,
    }))
    .sort((a, b) => a.progress - b.progress)
    .slice(0, 5);

  const nearlyComplete = allLeaves
    .filter((leaf) => {
      const progress = leaf.requiredCount > 0 ? (leaf.approvedCount / leaf.requiredCount) * 100 : 0;
      return progress >= 75 && progress < 100;
    })
    .map((leaf) => ({
      id: leaf.id,
      name: leaf.name,
      progress:
        leaf.requiredCount > 0 ? Math.round((leaf.approvedCount / leaf.requiredCount) * 100) : 0,
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 5);

  const notStarted = allLeaves
    .filter((leaf) => leaf.approvedCount === 0)
    .map((leaf) => ({
      id: leaf.id,
      name: leaf.name,
    }))
    .slice(0, 5);

  // Recent approvals (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentApprovals = tasks.filter(
    (task) =>
      task.status === 'approved' && task.createdAt && task.createdAt.toDate() > sevenDaysAgo,
  ).length;

  // Completion rate
  const startedLeaves = allLeaves.filter((leaf) => leaf.approvedCount > 0);
  const completedLeaves = allLeaves.filter(
    (leaf) => leaf.requiredCount > 0 && leaf.approvedCount >= leaf.requiredCount,
  );
  const completionRate =
    startedLeaves.length > 0
      ? Math.round((completedLeaves.length / startedLeaves.length) * 100)
      : 0;

  // Days remaining estimate
  let daysRemaining: number | null = null;
  if (recentApprovals > 0) {
    const totalRemaining = allLeaves.reduce(
      (sum, leaf) => sum + Math.max(0, leaf.requiredCount - leaf.approvedCount),
      0,
    );
    const dailyRate = recentApprovals / 7;
    daysRemaining = Math.ceil(totalRemaining / dailyRate);
  }

  return {
    bestCategory: bestCategory || null,
    needsAttention,
    nearlyComplete,
    notStarted,
    recentApprovals,
    completionRate,
    daysRemaining,
  };
}

export default function EnhancedProgress() {
  const { t, i18n } = useTranslation();
  const { rotationId } = useResidentActiveRotation();
  const { nodes } = useRotationNodes(rotationId);
  const { tasks } = useUserTasks();
  const { roots, totals } = useResidentProgress(rotationId, tasks, nodes);
  const { required: totalRequired, approved: totalApproved, pending: totalPending } = totals;

  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Calculate analytics
  const analytics = useMemo(() => analyzeProgress(roots, tasks), [roots, tasks]);

  const idToNode = useMemo(() => {
    const map = new Map<string, NodeProgress>();
    function collect(node: NodeProgress) {
      map.set(node.id, node);
      node.children.forEach(collect);
    }
    roots.forEach(collect);
    return map;
  }, [roots]);

  const displayName = (n: any) =>
    getLocalized({
      he: (n as any).name_he,
      en: (n as any).name_en,
      fallback: (n as any).name,
      lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
    });

  const totalRemaining = totalRequired - totalApproved;
  const overallProgress = totalRequired > 0 ? Math.round((totalApproved / totalRequired) * 100) : 0;

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    function collect(node: NodeProgress) {
      allIds.add(node.id);
      node.children.forEach(collect);
    }
    roots.forEach(collect);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Empty state
  if (!rotationId || roots.length === 0) {
    return (
      <div className="card-levitate p-12 text-center">
        <div className="text-4xl mb-4">📋</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('resident.noProgressData', { defaultValue: 'No Progress Data' })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('resident.startRotationToTrack', {
            defaultValue: 'Start a rotation to track your progress',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('resident.required', { defaultValue: 'Required' })}
              </div>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {totalRequired}
              </div>
            </div>
            <div className="text-3xl">📚</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('resident.approved', { defaultValue: 'Approved' })}
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {totalApproved}
              </div>
            </div>
            <div className="text-3xl">✅</div>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('resident.pending', { defaultValue: 'Pending' })}
              </div>
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {totalPending}
              </div>
            </div>
            <div className="text-3xl">⏳</div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {t('resident.remaining', { defaultValue: 'Remaining' })}
              </div>
              <div className="text-3xl font-bold text-gray-600 dark:text-gray-400">
                {totalRemaining}
              </div>
              {analytics.daysRemaining !== null && (
                <div className="text-xs text-gray-500 mt-1">
                  ~{analytics.daysRemaining} {t('common.days', { defaultValue: 'days' })}
                </div>
              )}
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </Card>
      </div>

      {/* View Mode Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          onClick={() => setViewMode('overview')}
          className="whitespace-nowrap"
        >
          📊 {t('resident.overview', { defaultValue: 'Overview' })}
        </Button>
        <Button
          variant={viewMode === 'categories' ? 'default' : 'outline'}
          onClick={() => setViewMode('categories')}
          className="whitespace-nowrap"
        >
          📁 {t('resident.byCategory', { defaultValue: 'By Category' })}
        </Button>
        <Button
          variant={viewMode === 'focus' ? 'default' : 'outline'}
          onClick={() => setViewMode('focus')}
          className="whitespace-nowrap"
        >
          🎯 {t('resident.focusAreas', { defaultValue: 'Focus Areas' })}
        </Button>
        <Button
          variant={viewMode === 'timeline' ? 'default' : 'outline'}
          onClick={() => setViewMode('timeline')}
          className="whitespace-nowrap"
        >
          📈 {t('resident.timeline', { defaultValue: 'Timeline' })}
        </Button>
      </div>

      {/* View Mode Content */}
      {viewMode === 'overview' && (
        <OverviewMode
          analytics={analytics}
          roots={roots}
          expandedNodes={expandedNodes}
          toggleNode={toggleNode}
          expandAll={expandAll}
          collapseAll={collapseAll}
          t={t}
          displayName={displayName}
          idToNode={idToNode}
        />
      )}

      {viewMode === 'categories' && (
        <CategoriesMode
          roots={roots}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          t={t}
        />
      )}

      {viewMode === 'focus' && (
        <FocusMode analytics={analytics} t={t} displayName={displayName} idToNode={idToNode} />
      )}

      {viewMode === 'timeline' && (
        <TimelineMode overallProgress={overallProgress} analytics={analytics} t={t} />
      )}
    </div>
  );
}

// Overview Mode Component
function OverviewMode({
  analytics,
  roots,
  expandedNodes,
  toggleNode,
  expandAll,
  collapseAll,
  t,
  displayName,
  idToNode,
}: any) {
  return (
    <div className="space-y-4">
      {/* Quick Insights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800">
          <div className="text-2xl mb-2">🎯</div>
          <div className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))] mb-1">
            {t('resident.mostProgress', { defaultValue: 'Most Progress' })}
          </div>
          <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
            {analytics.bestCategory
              ? displayName(
                  idToNode.get(analytics.bestCategory.name as unknown as string) || {
                    name: analytics.bestCategory.name,
                  },
                )
              : 'N/A'}
          </div>
          {analytics.bestCategory && (
            <div className="text-sm text-blue-600 dark:text-blue-400">
              {analytics.bestCategory.percentage}%
            </div>
          )}
        </Card>

        <Card className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800">
          <div className="text-2xl mb-2">⚡</div>
          <div className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))] mb-1">
            {t('resident.needsAttention', { defaultValue: 'Needs Attention' })}
          </div>
          <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
            {analytics.needsAttention.length}
          </div>
          <div className="text-sm text-amber-600 dark:text-amber-400">
            {t('resident.itemsStarted', { defaultValue: 'items started' })}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800">
          <div className="text-2xl mb-2">⏱️</div>
          <div className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))] mb-1">
            {t('resident.recentActivity', { defaultValue: 'Recent Activity' })}
          </div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">
            {analytics.recentApprovals}
          </div>
          <div className="text-sm text-green-600 dark:text-green-400">
            {t('resident.last7Days', { defaultValue: 'last 7 days' })}
          </div>
        </Card>

        <Card className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))] mb-1">
            {t('resident.completionRate', { defaultValue: 'Completion Rate' })}
          </div>
          <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
            {analytics.completionRate}%
          </div>
          <div className="text-sm text-purple-600 dark:text-purple-400">
            {t('resident.ofStarted', { defaultValue: 'of started items' })}
          </div>
        </Card>
      </div>

      {/* Progress Tree */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('resident.progressBreakdown', { defaultValue: 'Progress Breakdown' })}
          </h3>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={expandAll}>
              {t('ui.expandAll', { defaultValue: 'Expand All' })}
            </Button>
            <Button variant="ghost" size="sm" onClick={collapseAll}>
              {t('ui.collapseAll', { defaultValue: 'Collapse All' })}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          {roots.map((root: NodeProgress) => (
            <ProgressNode
              key={root.id}
              node={root}
              level={0}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

// Categories Mode Component
function CategoriesMode({ roots, selectedCategory, setSelectedCategory, t }: any) {
  const selectedNode = selectedCategory
    ? roots.find((r: NodeProgress) => r.id === selectedCategory)
    : null;

  return (
    <div className="space-y-4">
      {!selectedCategory ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roots.map((root: NodeProgress) => {
            const percentage =
              root.requiredCount > 0
                ? Math.round((root.approvedCount / root.requiredCount) * 100)
                : 0;

            const colorClass =
              percentage === 100
                ? 'from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-300 dark:border-green-700'
                : percentage >= 50
                  ? 'from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-300 dark:border-blue-700'
                  : 'from-gray-50 to-slate-50 dark:from-[rgb(var(--surface-depressed))] dark:to-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]';

            return (
              <Card
                key={root.id}
                className={`p-4 cursor-pointer hover:shadow-lg transition-all bg-gradient-to-br ${colorClass}`}
                onClick={() => setSelectedCategory(root.id)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex-1">
                    {root.name}
                  </h3>
                  <Badge
                    className={
                      percentage === 100
                        ? 'bg-green-600 text-white'
                        : percentage >= 50
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-white'
                    }
                  >
                    {percentage}%
                  </Badge>
                </div>

                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all duration-500 ${
                      percentage === 100
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                        : percentage >= 50
                          ? 'bg-gradient-to-r from-blue-500 to-cyan-500'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500'
                    }`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {root.approvedCount} / {root.requiredCount}{' '}
                  {t('common.completed', { defaultValue: 'completed' })}
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div>
          <Button variant="ghost" onClick={() => setSelectedCategory(null)} className="mb-4">
            ← {t('ui.back', { defaultValue: 'Back' })}
          </Button>

          {selectedNode && (
            <Card className="p-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                {selectedNode.name}
              </h3>

              <div className="space-y-2">
                {selectedNode.children.map((child: NodeProgress) => (
                  <ProgressNode
                    key={child.id}
                    node={child}
                    level={0}
                    expandedNodes={new Set()}
                    toggleNode={() => {}}
                  />
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// Focus Mode Component
function FocusMode({ analytics, t, displayName, idToNode }: any) {
  return (
    <div className="space-y-4">
      {/* Priority Items */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🎯</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('resident.priorityItems', { defaultValue: 'Priority Items' })}
          </h3>
          <Badge className="bg-amber-600 text-white">{analytics.needsAttention.length}</Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('resident.priorityItemsDesc', {
            defaultValue: 'Started but less than 50% complete - focus here!',
          })}
        </p>

        {analytics.needsAttention.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('resident.noPriorityItems', {
              defaultValue: 'Great! No items need immediate attention',
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {analytics.needsAttention.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {displayName(idToNode.get(item.id) || { name: item.name })}
                </span>
                <Badge className="bg-amber-600 text-white">{item.progress}%</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Nearly Complete */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🏁</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('resident.nearlyComplete', { defaultValue: 'Nearly Complete' })}
          </h3>
          <Badge className="bg-green-600 text-white">{analytics.nearlyComplete.length}</Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('resident.nearlyCompleteDesc', { defaultValue: 'Over 75% complete - quick wins!' })}
        </p>

        {analytics.nearlyComplete.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('resident.noNearlyComplete', { defaultValue: 'No items are nearly complete yet' })}
          </div>
        ) : (
          <div className="space-y-2">
            {analytics.nearlyComplete.map((item: any) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {displayName(idToNode.get(item.id) || { name: item.name })}
                </span>
                <Badge className="bg-green-600 text-white">{item.progress}%</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Not Started */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">🆕</span>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('resident.notStarted', { defaultValue: 'Not Started' })}
          </h3>
          <Badge className="bg-gray-600 text-white">{analytics.notStarted.length}</Badge>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          {t('resident.notStartedDesc', { defaultValue: 'Items with 0% progress' })}
        </p>

        {analytics.notStarted.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('resident.allStarted', { defaultValue: 'All items have been started!' })}
          </div>
        ) : (
          <div className="space-y-2">
            {analytics.notStarted.map((item: any) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 dark:bg-[rgb(var(--surface-depressed))] border border-gray-200 dark:border-[rgb(var(--border))] rounded-lg"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {displayName(idToNode.get(item.id) || { name: item.name })}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Timeline Mode Component
function TimelineMode({ overallProgress, analytics, t }: any) {
  const milestones = [
    { percent: 25, label: '25%', icon: '🌱' },
    { percent: 50, label: '50%', icon: '🌿' },
    { percent: 75, label: '75%', icon: '🌳' },
    { percent: 100, label: '100%', icon: '🏆' },
  ];

  return (
    <div className="space-y-4">
      {/* Progress Bar */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          {t('resident.overallProgress', { defaultValue: 'Overall Progress' })}
        </h3>

        <div className="relative">
          <div className="w-full h-8 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 via-green-500 to-emerald-500 transition-all duration-1000 flex items-center justify-end pr-3"
              style={{ width: `${overallProgress}%` }}
            >
              <span className="text-white font-bold text-sm">{overallProgress}%</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Milestones */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
          {t('resident.milestones', { defaultValue: 'Milestones' })}
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {milestones.map((milestone) => {
            const achieved = overallProgress >= milestone.percent;
            return (
              <div
                key={milestone.percent}
                className={`p-4 rounded-lg border-2 transition-all ${
                  achieved
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-500 dark:border-green-600'
                    : 'bg-gray-50 dark:bg-[rgb(var(--surface-depressed))] border-gray-300 dark:border-[rgb(var(--border))]'
                }`}
              >
                <div className="text-3xl mb-2">{milestone.icon}</div>
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {milestone.label}
                </div>
                {achieved ? (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                    <span>✓</span>
                    <span>{t('resident.achieved', { defaultValue: 'Achieved' })}</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    {t('resident.pending', { defaultValue: 'Pending' })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('resident.recentApprovals', { defaultValue: 'Approved (7 days)' })}
          </div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {analytics.recentApprovals}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('resident.completionRate', { defaultValue: 'Completion Rate' })}
          </div>
          <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {analytics.completionRate}%
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            {t('resident.daysRemaining', { defaultValue: 'Est. Days Remaining' })}
          </div>
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {analytics.daysRemaining !== null ? `~${analytics.daysRemaining}` : 'N/A'}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Progress Node Component (for tree view)
function ProgressNode({
  node,
  level,
  expandedNodes,
  toggleNode,
}: {
  node: NodeProgress;
  level: number;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
}) {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0;
  const percentage =
    node.requiredCount > 0 ? Math.round((node.approvedCount / node.requiredCount) * 100) : 0;

  return (
    <div>
      <div
        className={`flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-[rgb(var(--surface-elevated))] transition-colors ${
          hasChildren ? 'cursor-pointer' : ''
        }`}
        style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
        onClick={() => hasChildren && toggleNode(node.id)}
      >
        {hasChildren && <span className="text-gray-500 dark:text-gray-400">{isExpanded ? '▼' : '▶'}</span>}
        {!hasChildren && <span className="w-4" />}

        <span className="flex-1 text-sm text-gray-900 dark:text-gray-100">{node.name}</span>

        {node.pendingCount > 0 && (
          <Badge className="bg-amber-600 text-white text-xs">{node.pendingCount} pending</Badge>
        )}

        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-400 w-16 text-right">
            {node.approvedCount}/{node.requiredCount}
          </span>
        </div>
      </div>

      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <ProgressNode
              key={child.id}
              node={child}
              level={level + 1}
              expandedNodes={expandedNodes}
              toggleNode={toggleNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
