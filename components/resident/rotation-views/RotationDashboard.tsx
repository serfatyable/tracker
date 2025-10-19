'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useResidentProgress, type NodeProgress } from '../../../lib/hooks/useResidentProgress';
import { useRotationNodes } from '../../../lib/hooks/useRotationNodes';
import { useUserTasks } from '../../../lib/hooks/useUserTasks';
import { getLocalized } from '../../../lib/i18n/getLocalized';
import Badge from '../../ui/Badge';
// Unused import removed: Button
import Card from '../../ui/Card';

interface RotationDashboardProps {
  rotationId: string;
  onNavigateToBrowse: (leafId: string) => void;
}

export default function RotationDashboard({
  rotationId,
  onNavigateToBrowse,
}: RotationDashboardProps) {
  const { t, i18n } = useTranslation();
  const { nodes } = useRotationNodes(rotationId);
  const { tasks } = useUserTasks();
  const { roots, totals: _totals } = useResidentProgress(rotationId, tasks, nodes);

  // Get all leaves from the tree
  const leaves = useMemo(() => getAllLeaves(roots), [roots]);

  // Categorize leaves based on progress
  const categorized = useMemo(() => categorizeLeaves(leaves), [leaves]);

  // Get recent tasks for this rotation (last 5 approved)
  const recentTasks = useMemo(() => {
    return tasks
      .filter((t) => t.rotationId === rotationId && t.status === 'approved')
      .sort((a, b) => {
        const aTime = (a as any).createdAt?.toDate?.() || new Date(0);
        const bTime = (b as any).createdAt?.toDate?.() || new Date(0);
        return bTime.getTime() - aTime.getTime();
      })
      .slice(0, 5);
  }, [tasks, rotationId]);

  // Map node IDs to names for display
  const nodeNames = useMemo(() => {
    const map: Record<string, string> = {};
    nodes.forEach((n) => {
      const display =
        getLocalized<string>({
          he: (n as any).name_he as any,
          en: (n as any).name_en as any,
          fallback: n.name as any,
          lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
        }) || n.name;
      map[n.id] = display;
    });
    return map;
  }, [nodes, i18n.language]);

  return (
    <div className="space-y-4">
      {/* Quick Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <StatCard
          title={t('resident.totalItems', { defaultValue: 'Total Items' })}
          value={leaves.length}
          color="gray"
        />
        <StatCard
          title={t('resident.completed', { defaultValue: 'Completed' })}
          value={categorized.complete.length}
          color="green"
        />
        <StatCard
          title={t('resident.inProgress', { defaultValue: 'In Progress' })}
          value={categorized.inProgress.length}
          color="blue"
        />
        <StatCard
          title={t('resident.notStarted', { defaultValue: 'Not Started' })}
          value={categorized.notStarted.length}
          color="gray"
        />
      </div>

      {/* Focus Section */}
      <Card>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-50">
          🎯 {t('resident.focusAreas', { defaultValue: 'Focus Areas' })}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          {t('resident.focusDescription', {
            defaultValue: "Based on your progress, here's what to prioritize:",
          })}
        </p>

        <div className="space-y-4">
          {/* Priority 1: Items with partial progress */}
          <FocusGroup
            title={t('resident.finishThese', {
              defaultValue: 'Finish These (Started but incomplete)',
            })}
            items={categorized.startedButLow.slice(0, 5)}
            icon="⚡"
            onNavigate={onNavigateToBrowse}
          />

          {/* Priority 2: Items close to completion */}
          <FocusGroup
            title={t('resident.almostThere', { defaultValue: 'Almost There (Quick wins)' })}
            items={categorized.nearlyComplete.slice(0, 5)}
            icon="🏁"
            onNavigate={onNavigateToBrowse}
          />

          {/* Priority 3: Not started items */}
          <FocusGroup
            title={t('resident.startThese', { defaultValue: 'Start These (Expand your skills)' })}
            items={categorized.notStarted.slice(0, 5)}
            icon="🆕"
            onNavigate={onNavigateToBrowse}
          />
        </div>
      </Card>

      {/* Category Progress Overview */}
      <Card>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-50">
          📊 {t('resident.progressByCategory', { defaultValue: 'Progress by Category' })}
        </h3>
        <div className="space-y-3">
          {roots.map((cat) => (
            <div key={cat.id}>
              <div className="flex justify-between mb-1 text-sm text-gray-900 dark:text-gray-50">
                <span className="font-medium">
                  {getLocalized<string>({
                    he: (cat as any).name_he as any,
                    en: (cat as any).name_en as any,
                    fallback: cat.name as any,
                    lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
                  }) || cat.name}
                </span>
                <span className="text-gray-600 dark:text-gray-300">
                  {cat.approvedCount}/{cat.requiredCount}
                </span>
              </div>
              <ProgressBar
                percent={
                  cat.requiredCount > 0
                    ? Math.round((cat.approvedCount / cat.requiredCount) * 100)
                    : 0
                }
              />
            </div>
          ))}
          {roots.length === 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">
              {t('resident.noCategoriesYet', { defaultValue: 'No categories defined yet.' })}
            </div>
          )}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card>
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-gray-50">
          📝 {t('resident.recentActivity', { defaultValue: 'Recent Activity' })}
        </h3>
        {recentTasks.length === 0 ? (
          <div className="text-sm text-gray-600 dark:text-gray-300 text-center py-4">
            {t('resident.noRecentActivity', {
              defaultValue: 'No recent activity. Start logging your progress!',
            })}
          </div>
        ) : (
          <div className="space-y-2">
            {recentTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 dark:bg-[rgb(var(--surface-depressed))] text-sm"
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900 dark:text-gray-50">
                    {nodeNames[task.itemId] || task.itemId}
                  </div>
                  {task.note && (
                    <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                      {task.note}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="!bg-green-100 !text-green-800 dark:!bg-green-900/60 dark:!text-green-200"
                  >
                    +{task.count}
                  </Badge>
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {((task as any).createdAt?.toDate?.() || new Date()).toLocaleDateString(
                      i18n.language === 'he' ? 'he-IL' : 'en-US',
                      { year: 'numeric', month: 'short', day: 'numeric' },
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// Helper Components

function StatCard({
  title,
  value,
  color,
}: {
  title: string;
  value: number;
  color: 'gray' | 'green' | 'blue';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 dark:bg-[rgb(var(--surface-elevated))] border-gray-200 dark:border-[rgb(var(--border))]',
    green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
  };

  const textColor = {
    gray: 'text-gray-900 dark:text-gray-100',
    green: 'text-green-900 dark:text-green-100',
    blue: 'text-blue-900 dark:text-blue-100',
  };

  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]}`}>
      <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">{title}</div>
      <div className={`text-3xl font-bold ${textColor[color]}`}>{value}</div>
    </div>
  );
}

function FocusGroup({
  title,
  items,
  icon,
  onNavigate,
}: {
  title: string;
  items: NodeProgress[];
  icon: string;
  onNavigate: (leafId: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-50">
        <span>{icon}</span>
        <span>{title}</span>
      </h4>
      <div className="space-y-1.5">
        {items.map((item) => {
          const percent =
            item.requiredCount > 0
              ? Math.round((item.approvedCount / item.requiredCount) * 100)
              : 0;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="w-full flex items-center justify-between py-2 px-3 rounded-md bg-gray-50 dark:bg-[rgb(var(--surface-depressed))] hover:bg-gray-100 dark:hover:bg-[rgb(var(--surface-elevated))] transition text-left text-sm"
            >
              <span className="font-medium text-gray-900 dark:text-gray-50">{item.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {item.approvedCount}/{item.requiredCount}
                </span>
                <div className="w-16 h-1.5 bg-gray-200 dark:bg-[rgb(var(--surface-elevated))] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  const color =
    percent === 100 ? 'bg-green-500' : percent > 0 ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600';

  return (
    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all`}
        style={{ width: `${Math.min(100, percent)}%` }}
      />
    </div>
  );
}

// Helper Functions

function getAllLeaves(nodes: NodeProgress[]): NodeProgress[] {
  const leaves: NodeProgress[] = [];
  function traverse(node: NodeProgress) {
    if (node.children.length === 0 && node.requiredCount > 0) {
      leaves.push(node);
    } else {
      node.children.forEach(traverse);
    }
  }
  nodes.forEach(traverse);
  return leaves;
}

function categorizeLeaves(leaves: NodeProgress[]) {
  return {
    notStarted: leaves.filter((l) => l.approvedCount === 0 && l.requiredCount > 0),
    inProgress: leaves.filter((l) => l.approvedCount > 0 && l.approvedCount < l.requiredCount),
    complete: leaves.filter((l) => l.approvedCount >= l.requiredCount && l.requiredCount > 0),
    nearlyComplete: leaves.filter(
      (l) =>
        l.requiredCount > 0 &&
        l.approvedCount / l.requiredCount >= 0.75 &&
        l.approvedCount < l.requiredCount,
    ),
    startedButLow: leaves.filter(
      (l) => l.approvedCount > 0 && l.requiredCount > 0 && l.approvedCount / l.requiredCount < 0.5,
    ),
  };
}
