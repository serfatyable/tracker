'use client';

import { ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { collection, getDocs, getFirestore, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Dialog, DialogFooter, DialogHeader } from '@/components/ui/Dialog';
import { updateTasksStatus } from '@/lib/firebase/admin';
import { getFirebaseApp } from '@/lib/firebase/client';
import type { TaskDoc } from '@/lib/firebase/db';
import type { UserProfile } from '@/types/auth';
import type { Rotation, RotationNode } from '@/types/rotations';

type Props = {
  tasks: TaskDoc[];
  residents: UserProfile[];
  rotations: Rotation[];
};

type ResidentTaskRow = {
  id: string;
  name: string;
  rotationId: string;
  rotationName: string;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  count: number;
  requiredCount: number;
  note?: string | null;
  submittedAt: Date | null;
};

type ResidentCategoryGroup = {
  categoryId: string;
  name: string;
  order: number;
  tasks: ResidentTaskRow[];
};

type ResidentGroup = {
  residentId: string;
  residentName: string;
  residentEmail?: string | null;
  totalTasks: number;
  earliestSubmittedAt: Date | null;
  categories: ResidentCategoryGroup[];
};

type ConfirmAction = { action: 'approve' | 'reject'; taskIds: string[] };

function getLocalizedRotationName(rotation: Rotation | undefined, language: string) {
  if (!rotation) return '';
  if (language === 'he' && rotation.name_he) return rotation.name_he;
  if (language === 'en' && rotation.name_en) return rotation.name_en;
  return rotation.name || rotation.name_en || rotation.name_he || '';
}

function getLocalizedNodeName(node: RotationNode | undefined, language: string) {
  if (!node) return '';
  if (language === 'he' && node.name_he) return node.name_he;
  if (language === 'en' && node.name_en) return node.name_en;
  return node.name || node.name_en || node.name_he || '';
}

function getUserDisplayName(user: UserProfile | undefined, language: string) {
  if (!user) return '';
  if (language === 'he' && user.fullNameHe) return user.fullNameHe;
  return user.fullName || user.email || user.uid;
}

function findCategoryNode(node: RotationNode | undefined, allNodes: Map<string, RotationNode>) {
  let current = node;
  while (current) {
    if (current.type === 'category') return current;
    current = current.parentId ? allNodes.get(current.parentId) : undefined;
  }
  return null;
}

function getSubmittedAt(task: TaskDoc): Date | null {
  const value = task.createdAt as any;
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      // fall through
    }
  }
  if (value instanceof Date) return value;
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDateWithTime(date: Date | null, language: string) {
  if (!date) return null;
  try {
    const locale = language === 'he' ? 'he-IL' : 'en-US';
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export default function PendingTaskApprovals({ tasks, residents, rotations }: Props) {
  const { t, i18n } = useTranslation();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rotationNodes, setRotationNodes] = useState<RotationNode[]>([]);
  const [loadingNodes, setLoadingNodes] = useState(false);
  const [hiddenTaskIds, setHiddenTaskIds] = useState<Set<string>>(() => new Set());
  const [expandedResidents, setExpandedResidents] = useState<Set<string>>(() => new Set());
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(() => new Set());
  const [expandedCategories, setExpandedCategories] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );

  const resById = useMemo(
    () => new Map(residents.map((resident) => [resident.uid, resident])),
    [residents],
  );
  const rotById = useMemo(
    () => new Map(rotations.map((rotation) => [rotation.id, rotation])),
    [rotations],
  );
  const nodeById = useMemo(
    () => new Map(rotationNodes.map((node) => [node.id, node] as const)),
    [rotationNodes],
  );

  useEffect(() => {
    const uniqueRotationIds = Array.from(new Set(tasks.map((task) => task.rotationId)));
    if (uniqueRotationIds.length === 0) {
      setRotationNodes([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setLoadingNodes(true);
        const db = getFirestore(getFirebaseApp());
        const snapshots = await Promise.all(
          uniqueRotationIds.map((rotationId) =>
            getDocs(query(collection(db, 'rotationNodes'), where('rotationId', '==', rotationId))),
          ),
        );
        if (cancelled) return;
        const allNodes = snapshots.flatMap((snap) =>
          snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() as any) }) as RotationNode),
        );
        setRotationNodes(allNodes);
      } catch (error) {
        console.error('Failed to load rotation nodes:', error);
      } finally {
        if (!cancelled) {
          setLoadingNodes(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tasks]);

  useEffect(() => {
    const currentIds = new Set(tasks.map((task) => task.id));
    setHiddenTaskIds((prev) => {
      if (!prev.size) return prev;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (currentIds.has(id)) {
          next.add(id);
        }
      });
      if (next.size === prev.size) return prev;
      return next;
    });
  }, [tasks]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => task.status === 'pending' && !hiddenTaskIds.has(task.id)),
    [tasks, hiddenTaskIds],
  );

  const language = i18n.language;

  const residentGroups = useMemo<ResidentGroup[]>(() => {
    const grouped = new Map<
      string,
      { residentId: string; residentName: string; residentEmail?: string | null; tasks: ResidentTaskRow[] }
    >();

    visibleTasks.forEach((task) => {
      const resident = resById.get(task.userId);
      const rotation = rotById.get(task.rotationId);
      const node = nodeById.get(task.itemId);
      const categoryNode = findCategoryNode(node, nodeById);

      const rotationName = getLocalizedRotationName(rotation, language) || task.rotationId;
      const taskName = getLocalizedNodeName(node, language) || task.itemId;
      const categoryName = categoryNode ? getLocalizedNodeName(categoryNode, language) : rotationName;
      const categoryId = categoryNode ? categoryNode.id : `rotation:${task.rotationId}`;
      const categoryOrder = categoryNode?.order ?? 9999;
      const submittedAt = getSubmittedAt(task);
      const residentName = getUserDisplayName(resident, language) || task.userId;
      const residentEmail = resident?.email ?? null;

      if (!grouped.has(task.userId)) {
        grouped.set(task.userId, {
          residentId: task.userId,
          residentName,
          residentEmail,
          tasks: [],
        });
      }

      grouped.get(task.userId)!.tasks.push({
        id: task.id,
        name: taskName,
        rotationId: task.rotationId,
        rotationName,
        categoryId,
        categoryName,
        categoryOrder,
        count: task.count,
        requiredCount: task.requiredCount,
        note: task.note,
        submittedAt,
      });
    });

    const groups: ResidentGroup[] = Array.from(grouped.values()).map((group) => {
      const categoriesMap = new Map<string, ResidentCategoryGroup>();

      group.tasks.forEach((task) => {
        if (!categoriesMap.has(task.categoryId)) {
          categoriesMap.set(task.categoryId, {
            categoryId: task.categoryId,
            name: task.categoryName,
            order: task.categoryOrder,
            tasks: [],
          });
        }
        categoriesMap.get(task.categoryId)!.tasks.push(task);
      });

      const categories = Array.from(categoriesMap.values())
        .map((category) => ({
          ...category,
          tasks: category.tasks.sort((a, b) => {
            const timeA = a.submittedAt?.getTime() ?? 0;
            const timeB = b.submittedAt?.getTime() ?? 0;
            if (timeA !== timeB) return timeB - timeA;
            return a.name.localeCompare(b.name, language, { sensitivity: 'base' });
          }),
        }))
        .sort((a, b) => {
          if (a.order === b.order) {
            return a.name.localeCompare(b.name, language, { sensitivity: 'base' });
          }
          return a.order - b.order;
        });

      const earliestSubmittedAt = group.tasks.reduce<Date | null>((earliest, task) => {
        if (!task.submittedAt) return earliest;
        if (!earliest || task.submittedAt < earliest) return task.submittedAt;
        return earliest;
      }, null);

      return {
        residentId: group.residentId,
        residentName: group.residentName,
        residentEmail: group.residentEmail,
        totalTasks: group.tasks.length,
        earliestSubmittedAt,
        categories,
      };
    });

    return groups.sort((a, b) =>
      a.residentName.localeCompare(b.residentName, language, { sensitivity: 'base' }),
    );
  }, [language, nodeById, resById, rotById, visibleTasks]);

  useEffect(() => {
    setExpandedCategories((prev) => {
      if (prev.size === 0) return prev;

      const residentIds = new Set(residentGroups.map((group) => group.residentId));
      const next = new Map<string, Set<string>>();
      let changed = false;

      residentGroups.forEach((group) => {
        const existing = prev.get(group.residentId);
        if (!existing || existing.size === 0) return;
        const validCategoryIds = new Set(group.categories.map((category) => category.categoryId));
        const filtered = new Set<string>();
        existing.forEach((categoryId) => {
          if (validCategoryIds.has(categoryId)) {
            filtered.add(categoryId);
          } else {
            changed = true;
          }
        });
        if (filtered.size > 0) {
          next.set(group.residentId, filtered);
        } else {
          changed = true;
        }
      });

      prev.forEach((_, residentId) => {
        if (!residentIds.has(residentId)) {
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [residentGroups]);

  const visibleTaskIds = useMemo(() => {
    const set = new Set<string>();
    residentGroups.forEach((group) =>
      group.categories.forEach((category) =>
        category.tasks.forEach((task) => {
          set.add(task.id);
        }),
      ),
    );
    return set;
  }, [residentGroups]);

  useEffect(() => {
    setSelectedTaskIds((prev) => {
      if (!prev.size) return prev;
      let changed = false;
      const next = new Set<string>();
      prev.forEach((id) => {
        if (visibleTaskIds.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed || next.size !== prev.size ? next : prev;
    });
  }, [visibleTaskIds]);

  useEffect(() => {
    setExpandedResidents((prev) => {
      const allowedIds = new Set(residentGroups.map((group) => group.residentId));
      const next = new Set<string>();
      prev.forEach((id) => {
        if (allowedIds.has(id)) {
          next.add(id);
        }
      });
      if (next.size === 0 && residentGroups[0]) {
        next.add(residentGroups[0].residentId);
      }
      const unchanged =
        next.size === prev.size && Array.from(next).every((id) => prev.has(id));
      return unchanged ? prev : next;
    });
  }, [residentGroups]);

  if (!residentGroups.length) return null;

  const toggleResident = (residentId: string) => {
    setExpandedResidents((prev) => {
      const next = new Set(prev);
      if (next.has(residentId)) {
        next.delete(residentId);
      } else {
        next.add(residentId);
      }
      return next;
    });
  };

  const toggleTaskSelection = (taskId: string) => {
    if (isProcessing) return;
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  };

  const toggleCategorySelection = (category: ResidentCategoryGroup) => {
    if (isProcessing) return;
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      const everySelected = category.tasks.every((task) => next.has(task.id));
      if (everySelected) {
        category.tasks.forEach((task) => next.delete(task.id));
      } else {
        category.tasks.forEach((task) => next.add(task.id));
      }
      return next;
    });
  };

  const toggleCategoryExpansion = (residentId: string, categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Map(prev);
      const current = new Set(next.get(residentId) ?? []);
      if (current.has(categoryId)) {
        current.delete(categoryId);
      } else {
        current.add(categoryId);
      }
      if (current.size > 0) {
        next.set(residentId, current);
      } else {
        next.delete(residentId);
      }
      return next;
    });
  };

  const clearSelectionForTasks = (taskIds: string[]) => {
    if (!taskIds.length) return;
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      taskIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const handleBatchAction = (action: 'approve' | 'reject', taskIds: string[]) => {
    if (!taskIds.length) return;
    setErrorMessage(null);
    setConfirmAction({ action, taskIds });
  };

  const handleSingleAction = (taskId: string, action: 'approve' | 'reject') => {
    handleBatchAction(action, [taskId]);
  };

  const closeDialog = () => {
    if (isProcessing) return;
    setConfirmAction(null);
  };

  const onConfirm = async () => {
    if (!confirmAction) return;
    setIsProcessing(true);
    setErrorMessage(null);
    try {
      await updateTasksStatus({
        taskIds: confirmAction.taskIds,
        status: confirmAction.action === 'approve' ? 'approved' : 'rejected',
      });
      setHiddenTaskIds((prev) => {
        const next = new Set(prev);
        confirmAction.taskIds.forEach((id) => next.add(id));
        return next;
      });
      setSelectedTaskIds((prev) => {
        const next = new Set(prev);
        confirmAction.taskIds.forEach((id) => next.delete(id));
        return next;
      });
    } catch (error) {
      console.error('Failed to update task status', error);
      const message =
        confirmAction.action === 'approve'
          ? t('toasts.failedToApproveTasks', { defaultValue: 'Failed to approve tasks' })
          : t('toasts.failedToRejectTasks', { defaultValue: 'Failed to reject tasks' });
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
      setConfirmAction(null);
    }
  };

  return (
    <Card
      title={t('tutor.pendingTaskApprovals')}
      className="card-levitate [&>div]:p-6 [&>header]:px-6 [&>header]:py-4"
    >
      {loadingNodes ? (
        <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
          {t('ui.loading', { defaultValue: 'Loading...' })}
        </p>
      ) : null}
      {errorMessage ? (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-200">
          {errorMessage}
        </div>
      ) : null}
      <div className="space-y-4">
        {residentGroups.map((group) => {
          const isExpanded = expandedResidents.has(group.residentId);
          const groupTaskIds = group.categories.flatMap((category) =>
            category.tasks.map((task) => task.id),
          );
          const groupSelectedIds = groupTaskIds.filter((id) => selectedTaskIds.has(id));
          const earliestLabel = formatDateWithTime(group.earliestSubmittedAt, language);

          return (
            <div
              key={group.residentId}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-md dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface))]"
            >
              <button
                type="button"
                onClick={() => toggleResident(group.residentId)}
                className="flex w-full items-center justify-between gap-5 px-5 py-4 text-left transition hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))]"
                aria-expanded={isExpanded}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={group.residentName} email={group.residentEmail ?? undefined} size={36} />
                  <div>
                    <div className="text-base font-semibold text-gray-900 dark:text-gray-50">
                      {group.residentName}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                      <span>
                        {t('tutor.residentPendingSummary', {
                          count: group.totalTasks,
                          defaultValue:
                            group.totalTasks === 1
                              ? '1 pending task'
                              : `${group.totalTasks} pending tasks`,
                        })}
                      </span>
                      {earliestLabel ? (
                        <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                          •
                          <span>
                            {t('tutor.taskSubmittedOn', {
                              date: earliestLabel,
                              defaultValue: `Submitted ${earliestLabel}`,
                            })}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary">
                    {t('tutor.tasksPendingCount', {
                      count: group.totalTasks,
                      defaultValue:
                        group.totalTasks === 1 ? '1 pending' : `${group.totalTasks} pending`,
                    })}
                  </Badge>
                  {isExpanded ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  ) : (
                    <ChevronRightIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                  )}
                </div>
              </button>

              {isExpanded ? (
                <div className="space-y-3 border-t border-gray-200 bg-gray-50/60 px-5 py-4 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface-elevated))]">
                  {group.categories.map((category) => {
                    const categoryTaskIds = category.tasks.map((task) => task.id);
                    const categorySelectedCount = categoryTaskIds.filter((id) =>
                      selectedTaskIds.has(id),
                    ).length;
                    const everySelected =
                      categorySelectedCount === category.tasks.length && category.tasks.length > 0;
                    const isCategoryExpanded =
                      expandedCategories.get(group.residentId)?.has(category.categoryId) ?? false;

                    return (
                      <div
                        key={category.categoryId}
                        className="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface))]"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-3 dark:border-[rgb(var(--border))]">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpansion(group.residentId, category.categoryId)}
                            className="flex flex-1 items-center gap-2 text-left text-sm font-semibold text-gray-900 transition hover:text-teal-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 dark:text-gray-50 dark:hover:text-teal-200"
                            aria-expanded={isCategoryExpanded}
                          >
                            {isCategoryExpanded ? (
                              <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            ) : (
                              <ChevronRightIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
                            )}
                            <span>{category.name}</span>
                            <Badge variant="outline">
                              {t('tutor.tasksPendingCount', {
                                count: category.tasks.length,
                                defaultValue:
                                  category.tasks.length === 1
                                    ? '1 pending'
                                    : `${category.tasks.length} pending`,
                              })}
                            </Badge>
                          </button>
                          {isCategoryExpanded ? (
                            <button
                              type="button"
                              className="text-xs font-medium text-teal-700 transition hover:text-teal-600 disabled:cursor-not-allowed disabled:opacity-60 dark:text-teal-300 dark:hover:text-teal-200"
                              onClick={() => toggleCategorySelection(category)}
                              disabled={isProcessing || category.tasks.length === 0}
                            >
                              {everySelected
                                ? t('tutor.clearSelection', { defaultValue: 'Clear selection' })
                                : t('tutor.selectAll', { defaultValue: 'Select all' })}
                            </button>
                          ) : null}
                        </div>
                        {isCategoryExpanded ? (
                          <div className="divide-y divide-gray-200 dark:divide-[rgb(var(--border))]">
                            {category.tasks.map((task) => {
                              const isSelected = selectedTaskIds.has(task.id);
                              const submittedLabel = formatDateWithTime(task.submittedAt, language);

                              return (
                                <div
                                  key={task.id}
                                  className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between"
                                >
                                  <div className="flex flex-1 items-start gap-3">
                                    <input
                                      type="checkbox"
                                      className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-2 focus:ring-teal-500 dark:border-[rgb(var(--border))]"
                                      checked={isSelected}
                                      onChange={() => toggleTaskSelection(task.id)}
                                      disabled={isProcessing}
                                      aria-label={t('tutor.selectTaskLabel', {
                                        task: task.name,
                                        defaultValue: `Select task ${task.name}`,
                                      })}
                                    />
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-50">
                                        <span>{task.name}</span>
                                        <Badge variant="secondary">{task.rotationName}</Badge>
                                        <span className="text-xs font-medium text-gray-500 dark:text-gray-300">
                                          {task.count}/{task.requiredCount}
                                        </span>
                                      </div>
                                      {task.note ? (
                                        <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                                          {task.note}
                                        </p>
                                      ) : null}
                                      {submittedLabel ? (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {t('tutor.taskSubmittedOn', {
                                            date: submittedLabel,
                                            defaultValue: `Submitted ${submittedLabel}`,
                                          })}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 self-start md:self-center">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                                      onClick={() => handleSingleAction(task.id, 'approve')}
                                      disabled={isProcessing}
                                    >
                                      {t('tutor.approve')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                                      onClick={() => handleSingleAction(task.id, 'reject')}
                                      disabled={isProcessing}
                                    >
                                      {t('tutor.deny')}
                                    </Button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}

                  <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 text-sm dark:border-[rgb(var(--border))] md:flex-row md:items-center md:justify-between">
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      {groupSelectedIds.length
                        ? t('tutor.selectedCount', {
                            count: groupSelectedIds.length,
                            defaultValue:
                              groupSelectedIds.length === 1
                                ? '1 selected'
                                : `${groupSelectedIds.length} selected`,
                          })
                        : t('tutor.selectTasksHint', {
                            defaultValue: 'Select tasks to enable batch actions',
                          })}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => clearSelectionForTasks(groupSelectedIds)}
                        disabled={!groupSelectedIds.length || isProcessing}
                      >
                        {t('tutor.clearSelection', { defaultValue: 'Clear selection' })}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleBatchAction('approve', groupSelectedIds)}
                        disabled={!groupSelectedIds.length || isProcessing}
                      >
                        {t('tutor.approveSelected', { defaultValue: 'Approve selected' })}
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleBatchAction('reject', groupSelectedIds)}
                        disabled={!groupSelectedIds.length || isProcessing}
                      >
                        {t('tutor.rejectSelected', { defaultValue: 'Reject selected' })}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <Dialog open={!!confirmAction} onClose={closeDialog}>
        <div className="space-y-3 p-4">
          <DialogHeader>
            {confirmAction
              ? confirmAction.taskIds.length > 1
                ? confirmAction.action === 'approve'
                  ? t('tutor.confirmApproveSelected', {
                      count: confirmAction.taskIds.length,
                      defaultValue:
                        confirmAction.taskIds.length === 1
                          ? 'Approve selected task?'
                          : `Approve ${confirmAction.taskIds.length} selected tasks?`,
                    })
                  : t('tutor.confirmRejectSelected', {
                      count: confirmAction.taskIds.length,
                      defaultValue:
                        confirmAction.taskIds.length === 1
                          ? 'Reject selected task?'
                          : `Reject ${confirmAction.taskIds.length} selected tasks?`,
                    })
                : confirmAction.action === 'approve'
                  ? t('tutor.approveTask', { defaultValue: 'Approve task' })
                  : t('tutor.denyTask', { defaultValue: 'Deny task' })
              : null}
          </DialogHeader>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {t('ui.areYouSure', { defaultValue: 'Are you sure?' })}
          </p>
          <DialogFooter>
            <Button variant="secondary" onClick={closeDialog} disabled={isProcessing}>
              {t('ui.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={onConfirm} loading={isProcessing} disabled={isProcessing}>
              {t('ui.confirm', { defaultValue: 'Confirm' })}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </Card>
  );
}
