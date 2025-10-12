'use client';
import { useMemo, useState, useEffect } from 'react';
import type { RotationNode } from '../../types/rotations';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { useRotationNodes } from '../../lib/hooks/useRotationNodes';
import { useResidentActiveRotation } from '../../lib/hooks/useResidentActiveRotation';
import { getAuth } from 'firebase/auth';
import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask } from '../../lib/firebase/db';
import { useUserTasks } from '../../lib/hooks/useUserTasks';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { rotationId: activeRotationId } = useResidentActiveRotation();
  const { nodes, loading } = useRotationNodes(selectedRotationId || null);
  const { tasks } = useUserTasks();
  const [allNodes, setAllNodes] = useState<RotationNode[]>([]);

  // Load all nodes lazily when needed for global search
  useEffect(() => {
    (async () => {
      if (searchScope !== 'all') return;
      if (allNodes.length > 0) return;
      try {
        const db = getFirestore(getFirebaseApp());
        const snap = await getDocs(collection(db, 'rotationNodes'));
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as unknown as RotationNode[];
        setAllNodes(list);
      } catch {
        // ignore; results list will just be empty
      }
    })();
  }, [searchScope, allNodes.length]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  // Filter tree by search term: keep branches that have any matching descendant
  const filteredTree = useMemo(() => {
    if (!searchTerm.trim()) return tree;
    const needle = searchTerm.trim().toLowerCase();
    function nodeMatches(n: RotationNode): boolean {
      const hay = [n.name, n.mcqUrl || '', ...(n.links || []).map((l) => l.href || '')]
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
  }, [tree, searchTerm]);

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
      [n.name, ...(n.mcqUrl ? [n.mcqUrl] : []), ...(n.links || []).map((l) => l.href)]
        .join(' ')
        .toLowerCase();
    const curr = nodes.filter((n) => fields(n).includes(needle));
    const allR = allNodes.filter((n) => fields(n).includes(needle));
    return { results: searchScope === 'all' ? allR : curr, currentResults: curr, allResults: allR };
  }, [searchTerm, nodes, allNodes, searchScope]);

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
        <div className="rounded-md border border-gray-200 dark:border-gray-800 p-2 text-sm">
          {results.slice(0, 10).map((n) => (
            <div key={n.id} className="flex items-center justify-between py-1">
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
            <div className="text-xs text-gray-500">
              {t('ui.showingMatches', { shown: 10, total: results.length })}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="rounded-md border border-gray-200 dark:border-gray-800 p-2">
        {loading ? (
          <div className="text-sm text-gray-500">{t('ui.loadingItems')}</div>
        ) : filteredTree.length === 0 ? (
          <div className="text-sm text-gray-500">{t('ui.noItemsMatch')}</div>
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
}: {
  node: TreeNode;
  onSelectLeaf: (leaf: RotationNode) => void;
  onLog: (leaf: RotationNode, count: number) => void;
  canLog: (leaf: RotationNode) => boolean;
  countsByItemId: Record<string, { approved: number; pending: number }>;
  searchTerm: string;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isLeaf = node.type === 'leaf';
  const totals = branchTotals(node, countsByItemId);
  return (
    <div className="pl-2">
      <div className="flex items-center gap-2 py-1">
        {hasChildren ? (
          <button className="text-xs text-gray-600" onClick={() => setOpen((v) => !v)}>
            {open ? '▾' : '▸'}
          </button>
        ) : (
          <span className="text-xs text-transparent">▸</span>
        )}
        <span className="text-sm" onClick={() => (!isLeaf ? null : onSelectLeaf(node))}>
          {searchTerm.trim() ? highlight(node.name, searchTerm) : node.name}
        </span>
        {!isLeaf ? (
          <Badge className="ml-auto">
            {totals.approved}/{totals.pending}
          </Badge>
        ) : (
          <Button
            size="sm"
            className="ml-auto"
            disabled={!canLog(node)}
            onClick={() => onLog(node, 1)}
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
): { approved: number; pending: number } {
  let pending = 0;
  let approved = 0;
  function walk(n: TreeNode) {
    if (n.type === 'leaf') {
      const c = countsByItemId[n.id];
      if (c) {
        approved += c.approved;
        pending += c.pending;
      }
    }
    n.children.forEach(walk);
  }
  walk(node);
  return { approved, pending };
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
