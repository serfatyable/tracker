'use client';
import { getAuth } from 'firebase/auth';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask } from '../../lib/firebase/db';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { getLocalized } from '../../lib/i18n/getLocalized';
import type { RotationNode } from '../../types/rotations';
import { SpinnerSkeleton } from '../dashboard/Skeleton';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import EmptyState, { EmptyIcon } from '../ui/EmptyState';

type Props = {
  selectedRotationId: string | null;
  searchTerm: string;
  searchScope?: 'current' | 'all';
  onSelectLeaf: (leaf: RotationNode | null) => void;
  onAutoScopeAll?: () => void;
};

type TreeNode = RotationNode & { children: TreeNode[] };

export default function RotationBrowser({
  selectedRotationId,
  searchTerm,
  searchScope = 'current',
  onSelectLeaf,
  onAutoScopeAll,
}: Props) {
  const { t, i18n } = useTranslation();
  const { rotationId: activeRotationId } = useResidentActiveRotation();
  const { nodes, loading } = useRotationNodes(selectedRotationId || null);
  const { tasks } = useUserTasks();
  const [allNodes, setAllNodes] = useState<RotationNode[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  // Load all nodes lazily when needed for global search
  useEffect(() => {
    (async () => {
      if (searchScope !== 'all') return;
      if (allNodes.length > 0) return;
      try {
        setAllLoading(true);
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(collection(db, 'rotationNodes'));
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as unknown as RotationNode[];
        setAllNodes(list);
      } catch {
        // ignore; results list will just be empty
      } finally {
        setAllLoading(false);
      }
    })();
  }, [searchScope, allNodes.length]);

  const nodesToUse = searchScope === 'all' ? allNodes : nodes;
  const tree = useMemo(() => buildTree(nodesToUse), [nodesToUse]);

  // Filter tree by search term: keep branches that have any matching descendant
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return tree;
    const needle = searchTerm.trim().toLowerCase();
    function nodeMatches(n: RotationNode): boolean {
      const displayName =
        getLocalized<string>({
          he: (n as any).name_he as any,
          en: (n as any).name_en as any,
          fallback: n.name as any,
          lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
        }) || n.name;
      const linkLabels = (n.links || []).map(
        (l) =>
          getLocalized<string>({
            he: (l as any).label_he as any,
            en: (l as any).label_en as any,
            fallback: (l as any).label as any,
            lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
          }) ||
          l.href ||
          '',
      );
      const hay = [
        displayName,
        n.mcqUrl || '',
        ...(n.links || []).map((l) => l.href || ''),
        ...linkLabels,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(needle);
    }
    function filter(nodesIn: TreeNode[]): TreeNode[] {
      const out: TreeNode[] = [];
      for (const n of nodesIn) {
        const children = filter(n.children);
        if (children.length || nodeMatches(n)) {
          out.push({ ...n, children });
        }
      }
      return out;
    }
    return filter(tree);
  }, [tree, searchTerm, i18n.language]);

  const countsByItemId = useMemo(() => {
    const map: Record<string, { approved: number; pending: number }> = {};
    tasks.forEach((t) => {
      const bucket = (map[t.itemId] = map[t.itemId] || { approved: 0, pending: 0 });
      if (t.status === 'approved') bucket.approved += t.count || 0;
      else if (t.status === 'pending') bucket.pending += t.count || 0;
    });
    return map;
  }, [tasks]);

  const { results, currentResults, allResults } = useMemo(() => {
    const empty = {
      results: [] as RotationNode[],
      currentResults: [] as RotationNode[],
      allResults: [] as RotationNode[],
    };
    if (!searchTerm.trim()) return empty;
    const needle = searchTerm.trim().toLowerCase();
    const fields = (n: RotationNode) =>
      [
        getLocalized<string>({
          he: (n as any).name_he as any,
          en: (n as any).name_en as any,
          fallback: n.name as any,
          lang: (i18n.language === 'he' ? 'he' : 'en') as 'he' | 'en',
        }) || n.name,
        ...(n.mcqUrl ? [n.mcqUrl] : []),
        ...(n.links || []).map((l) => l.href),
      ]
        .join(' ')
        .toLowerCase();
    const curr = nodes.filter((n) => fields(n).includes(needle));
    const allR = allNodes.filter((n) => fields(n).includes(needle));
    return { results: searchScope === 'all' ? allR : curr, currentResults: curr, allResults: allR };
  }, [searchTerm, nodes, allNodes, searchScope, i18n.language]);

  useEffect(() => {
    if (searchScope !== 'current') return;
    if (!searchTerm.trim()) return;
    if (currentResults.length === 0 && allResults.length > 0) {
      onAutoScopeAll && onAutoScopeAll();
    }
  }, [searchScope, searchTerm, currentResults.length, allResults.length, onAutoScopeAll]);

  function canLog(leaf: RotationNode): boolean {
    return Boolean(activeRotationId && leaf.rotationId === activeRotationId);
  }

  async function onLog(leaf: RotationNode, count: number, note?: string) {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const req = leaf.requiredCount || 0;
    await createTask({
      userId: uid,
      rotationId: leaf.rotationId,
      itemId: leaf.id,
      count,
      requiredCount: req,
      note,
    });
  }

  return (
    <div className="space-y-3">
      {searchTerm.trim() && results.length > 0 ? (
        <div className="rounded-md border border-gray-200 dark:border-[rgb(var(--border))] p-2 text-sm">
          {results.slice(0, 10).map((n) => (
            <div
              key={n.id}
              className="flex items-center justify-between py-1 text-gray-900 dark:text-gray-50"
            >
              <span>{highlight(n.name, searchTerm)}</span>
              {n.type === 'leaf' ? (
                <Button
                  size="sm"
                  disabled={!canLog(n)}
                  onClick={() => onLog(n, 1)}
                  title={
                    !canLog(n)
                      ? (t('ui.loggingOnlyInActiveRotation') as string)
                      : (t('ui.plusOne') as string)
                  }
                >
                  {t('ui.plusOne')}
                </Button>
              ) : null}
            </div>
          ))}
          {results.length > 10 ? (
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {t('ui.showingMatches', { shown: 10, total: results.length })}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-md border border-gray-200 dark:border-[rgb(var(--border))] p-2">
        {loading || (searchScope === 'all' && allLoading) ? (
          <SpinnerSkeleton />
        ) : filteredTree.length === 0 ? (
          <EmptyState
            icon={<EmptyIcon size={36} />}
            title={t('ui.noItemsMatch', { defaultValue: 'No items match' })}
            description={
              searchTerm
                ? t('ui.tryDifferentSearch', { defaultValue: 'Try a different search term.' })
                : t('ui.noItemsAvailable', { defaultValue: 'No items available.' })
            }
            className="py-4"
          />
        ) : (
          filteredTree.map((n) => (
            <NodeItem
              key={n.id}
              node={n}
              onSelectLeaf={onSelectLeaf}
              onLog={onLog}
              canLog={canLog}
              countsByItemId={countsByItemId}
              searchTerm={searchTerm}
              categoryColor={null}
              parentName={undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

function NodeItem({
  node,
  onSelectLeaf,
  onLog,
  canLog,
  countsByItemId,
  searchTerm,
  categoryColor,
  parentName,
}: {
  node: TreeNode;
  onSelectLeaf: (leaf: RotationNode) => void;
  onLog: (leaf: RotationNode, count: number) => void;
  canLog: (leaf: RotationNode) => boolean;
  countsByItemId: Record<string, { approved: number; pending: number }>;
  searchTerm: string;
  categoryColor: { bg: string; border: string; baseColor: string } | null;
  parentName?: string;
}) {
  const [open, setOpen] = useState(false); // Start collapsed by default
  const hasChildren = node.children.length > 0;
  const isLeaf = node.type === 'leaf';
  const isCategory = node.type === 'category';

  // Check if this leaf has the same name as its parent (duplicate display issue)
  const isDuplicateName =
    isLeaf && parentName && node.name.toLowerCase().trim() === parentName.toLowerCase().trim();

  // If this is a category node, get its color scheme
  // Otherwise, inherit from parent
  const currentCategoryColor = isCategory ? getCategoryColor(node.name) : categoryColor;

  // Determine background opacity based on node type
  let bgClass = '';
  if (currentCategoryColor) {
    if (isCategory) {
      // Category itself: full color with border
      bgClass = `${currentCategoryColor.bg} ${currentCategoryColor.border}`;
    } else if (node.type === 'subject') {
      // Direct children (subjects): medium opacity
      if (currentCategoryColor.baseColor === 'blue') {
        bgClass = 'bg-blue-50/50 dark:bg-blue-950/15';
      } else if (currentCategoryColor.baseColor === 'green') {
        bgClass = 'bg-green-50/50 dark:bg-green-950/15';
      } else if (currentCategoryColor.baseColor === 'purple') {
        bgClass = 'bg-purple-50/50 dark:bg-purple-950/15';
      }
    } else {
      // Deeper children (topics, subtopics, leaves): light opacity
      if (currentCategoryColor.baseColor === 'blue') {
        bgClass = 'bg-blue-50/30 dark:bg-blue-950/10';
      } else if (currentCategoryColor.baseColor === 'green') {
        bgClass = 'bg-green-50/30 dark:bg-green-950/10';
      } else if (currentCategoryColor.baseColor === 'purple') {
        bgClass = 'bg-purple-50/30 dark:bg-purple-950/10';
      }
    }
  }

  const totals = branchTotals(node, countsByItemId);

  const handleRowClick = () => {
    if (hasChildren) {
      setOpen((v) => !v);
    }
    if (isLeaf) {
      onSelectLeaf(node);
    }
  };

  return (
    <div className="pl-2">
      <div
        className={
          'flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] ' +
          bgClass
        }
        onClick={handleRowClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleRowClick();
          }
        }}
      >
        {hasChildren ? (
          <span className="text-xs text-gray-600 dark:text-gray-300 select-none">
            {open ? '▾' : '▸'}
          </span>
        ) : (
          <span className="text-xs text-transparent">▸</span>
        )}
        <span
          className={`text-sm ${isCategory ? 'font-semibold' : ''} ${isLeaf ? 'hover:text-primary hover:underline' : ''} ${isDuplicateName ? 'text-gray-500 dark:text-gray-400 italic' : 'text-gray-900 dark:text-gray-50'}`}
        >
          {isDuplicateName ? (
            <span className="flex items-center gap-1">
              <span className="text-xs">↳</span>
              <span className="text-xs">(practice activities)</span>
            </span>
          ) : searchTerm.trim() ? (
            highlight(node.name, searchTerm)
          ) : (
            node.name
          )}
        </span>
        {!isLeaf ? (
          // Branch nodes: Show aggregated progress (approved / required)
          <Badge
            variant="secondary"
            className={`ml-auto text-xs font-bold px-2.5 py-1 ${
              totals.required === 0
                ? '!bg-gray-100 !text-gray-600 dark:!bg-gray-800 dark:!text-gray-400'
                : totals.approved >= totals.required
                  ? '!bg-green-100 !text-green-800 dark:!bg-green-900/60 dark:!text-green-200 border border-green-300 dark:border-green-700'
                  : totals.approved > 0
                    ? '!bg-amber-100 !text-amber-800 dark:!bg-amber-900/60 dark:!text-amber-200 border border-amber-300 dark:border-amber-700'
                    : '!bg-red-100 !text-red-800 dark:!bg-red-900/60 dark:!text-red-200 border border-red-300 dark:border-red-700'
            }`}
            title={`Completed: ${totals.approved} / Required: ${totals.required}`}
          >
            {totals.approved >= totals.required && totals.required > 0 ? '✓ ' : ''}
            {totals.approved} / {totals.required}
          </Badge>
        ) : node.requiredCount ? (
          // Leaf nodes: Show individual progress (approved / required)
          <>
            {(() => {
              const leafApproved = countsByItemId[node.id]?.approved || 0;
              const leafRequired = node.requiredCount;
              const isComplete = leafApproved >= leafRequired;
              const hasProgress = leafApproved > 0;

              return (
                <Badge
                  variant="secondary"
                  className={`ml-1 text-xs font-bold px-2.5 py-1 ${
                    isComplete
                      ? '!bg-green-100 !text-green-800 dark:!bg-green-900/60 dark:!text-green-200 border border-green-300 dark:border-green-700'
                      : hasProgress
                        ? '!bg-amber-100 !text-amber-800 dark:!bg-amber-900/60 dark:!text-amber-200 border border-amber-300 dark:border-amber-700'
                        : '!bg-red-100 !text-red-800 dark:!bg-red-900/60 dark:!text-red-200 border border-red-300 dark:border-red-700'
                  }`}
                  title={`${isComplete ? 'Complete!' : 'In progress'} - Approved: ${leafApproved}, Required: ${leafRequired}`}
                >
                  {isComplete ? '✓ ' : hasProgress ? '⚠ ' : '• '}
                  {leafApproved} / {leafRequired}
                </Badge>
              );
            })()}
            <Button
              size="sm"
              className="ml-auto"
              disabled={!canLog(node)}
              onClick={(e) => {
                e.stopPropagation();
                onLog(node, 1);
              }}
              title={!canLog(node) ? 'Logging allowed only in your active rotation' : '+1'}
            >
              +1
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            className="ml-auto"
            disabled={!canLog(node)}
            onClick={(e) => {
              e.stopPropagation();
              onLog(node, 1);
            }}
            title={!canLog(node) ? 'Logging allowed only in your active rotation' : '+1'}
          >
            +1
          </Button>
        )}
      </div>
      {hasChildren && open ? (
        <div className="pl-4">
          {node.children
            .sort((a, b) => a.order - b.order)
            .map((c) => (
              <NodeItem
                key={c.id}
                node={c}
                onSelectLeaf={onSelectLeaf}
                onLog={onLog}
                canLog={canLog}
                countsByItemId={countsByItemId}
                searchTerm={searchTerm}
                categoryColor={currentCategoryColor}
                parentName={node.name}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

function buildTree(nodes: RotationNode[]): TreeNode[] {
  const map: Record<string, TreeNode> = {};
  nodes.forEach((n) => {
    map[n.id] = { ...(n as any), children: [] };
  });
  const roots: TreeNode[] = [];
  nodes.forEach((n) => {
    if (n.parentId) {
      const parent = map[n.parentId];
      if (parent && map[n.id]) parent.children.push(map[n.id]!);
    } else {
      if (map[n.id]) roots.push(map[n.id]!);
    }
  });
  return roots.sort((a, b) => a.order - b.order);
}

function branchTotals(
  node: TreeNode,
  countsByItemId: Record<string, { approved: number; pending: number }>,
): { approved: number; required: number; pending: number } {
  let pending = 0;
  let approved = 0;
  let required = 0;
  function walk(n: TreeNode) {
    if (n.type === 'leaf') {
      required += n.requiredCount || 0;
      const c = countsByItemId[n.id];
      if (c) {
        approved += c.approved;
        pending += c.pending;
      }
    }
    n.children.forEach(walk);
  }
  walk(node);
  return { approved, required, pending };
}

function highlight(text: string, query: string) {
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) return text;
  return (
    <span>
      {text.slice(0, idx)}
      <span className="bg-yellow-200 text-yellow-900 dark:bg-yellow-600/40 dark:text-yellow-100">
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </span>
  );
}

function getCategoryColor(name: string): { bg: string; border: string; baseColor: string } | null {
  const normalized = name.toLowerCase();
  if (normalized.includes('knowledge')) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-l-4 border-blue-400 dark:border-blue-600',
      baseColor: 'blue',
    };
  }
  if (normalized.includes('skill')) {
    return {
      bg: 'bg-green-50 dark:bg-green-950/30',
      border: 'border-l-4 border-green-400 dark:border-green-600',
      baseColor: 'green',
    };
  }
  if (normalized.includes('guidance')) {
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-l-4 border-purple-400 dark:border-purple-600',
      baseColor: 'purple',
    };
  }
  return null;
}
