'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createNode,
  deleteNode,
  listRotationNodes,
  moveNode,
  reorderSiblings,
  updateNode,
} from '../../../lib/firebase/admin';
import { createSynonymMatcher } from '../../../lib/search/synonyms';
import { trackAdminEvent } from '../../../lib/telemetry';
import { logError } from '../../../lib/utils/logger';
import type { RotationNode } from '../../../types/rotations';
import Button from '../../ui/Button';
import Toast from '../../ui/Toast';

import { BulkActionsPanel, NodeEditor, NodePreview, guidanceForType } from './tree/NodePanels';
import { TreeList } from './tree/TreeList';
import type { TreeNode, DragState } from './tree/types';

type Props = { rotationId: string };

const STORAGE_PREFIX = 'rotationTree:';

function buildTree(nodes: RotationNode[]): TreeNode[] {
  const map: Record<string, TreeNode> = {};
  nodes.forEach((node) => {
    map[node.id] = { ...(node as RotationNode), children: [] } as TreeNode;
  });
  const roots: TreeNode[] = [];
  nodes.forEach((node) => {
    if (node.parentId) {
      const parent = map[node.parentId];
      if (parent) parent.children.push(map[node.id]!);
    } else {
      roots.push(map[node.id]!);
    }
  });
  return roots
    .filter(Boolean)
    .sort((a, b) => a.order - b.order)
    .map((root) => ({
      ...root,
      children: root.children.sort((a, b) => a.order - b.order),
    }));
}

const RotationTree = memo(function RotationTree({ rotationId }: Props) {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<RotationNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [initialStateLoaded, setInitialStateLoaded] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<DragState>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    variant?: 'success' | 'info' | 'warning' | 'error';
  } | null>(null);
  const hasStoredStateRef = useRef(false);
  const preservedExpandedRef = useRef<Record<string, boolean> | null>(null);

  const storageKey = useMemo(() => `${STORAGE_PREFIX}${rotationId}`, [rotationId]);

  const handleError = useCallback(
    (error: unknown, logMessage: string, toastKey: string, defaultToast: string) => {
      const err = error instanceof Error ? error : new Error(String(error));
      logError(logMessage, 'RotationTree', err);
      setToast({
        message: t(toastKey, { defaultValue: defaultToast }),
        variant: 'error',
      });
    },
    [t],
  );

  const refresh = useCallback(async () => {
    try {
      const fetched = await listRotationNodes(rotationId);
      setNodes(fetched);
      if (!hasStoredStateRef.current) {
        setExpanded({});
      }
    } catch (error) {
      handleError(
        error,
        'Failed to load rotation nodes',
        'rotationTree.error.refresh',
        'Failed to load rotation data. Please try again.',
      );
    }
  }, [handleError, rotationId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setInitialStateLoaded(true);
      return;
    }
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.selected) setSelected(parsed.selected);
        if (parsed.expanded) setExpanded(parsed.expanded);
        hasStoredStateRef.current = true;
      }
    } catch (error) {
      console.error('Failed to hydrate rotation tree preferences', error);
    } finally {
      setInitialStateLoaded(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!initialStateLoaded) return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ selected, expanded }));
    } catch (error) {
      console.error('Failed to persist rotation tree preferences', error);
    }
  }, [expanded, selected, storageKey, initialStateLoaded]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);
  const current = useMemo(
    () => (selected ? nodes.find((n) => n.id === selected) || null : null),
    [nodes, selected],
  );
  const breadcrumb = useMemo(() => buildBreadcrumb(selected, nodes), [selected, nodes]);
  const bulkSelectedNodes = useMemo(
    () =>
      bulkSelection
        .map((id) => nodes.find((n) => n.id === id))
        .filter((n): n is RotationNode => Boolean(n)),
    [bulkSelection, nodes],
  );
  const guidanceText = current ? guidanceForType(current.type, t) : '';

  useEffect(() => {
    if (!initialStateLoaded) return;
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      if (preservedExpandedRef.current) {
        setExpanded(preservedExpandedRef.current);
      }
      preservedExpandedRef.current = null;
      return;
    }

    if (!preservedExpandedRef.current) {
      preservedExpandedRef.current = { ...expanded };
    }

    const matcher = createSynonymMatcher(trimmed);
    const parentMap = new Map<string, string | null>();
    nodes.forEach((node) => parentMap.set(node.id, node.parentId));

    let firstMatch: RotationNode | null = null;
    for (const node of nodes) {
      if (matcher(node.name || '') || matcher(node.name_en || '') || matcher(node.name_he || '')) {
        firstMatch = node;
        break;
      }
    }

    if (!firstMatch) return;

    const idsToExpand = new Set<string>();
    if (firstMatch.type !== 'leaf') {
      idsToExpand.add(firstMatch.id);
    }

    let parentId = parentMap.get(firstMatch.id) ?? null;
    while (parentId) {
      idsToExpand.add(parentId);
      parentId = parentMap.get(parentId) ?? null;
    }

    setExpanded((prev) => {
      let changed = false;
      const next = { ...prev };
      idsToExpand.forEach((id) => {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [expanded, initialStateLoaded, nodes, searchTerm]);

  useEffect(() => {
    if (!initialStateLoaded) return;
    if (nodes.length === 0) {
      setSelected(null);
      return;
    }
    if (selected && nodes.some((n) => n.id === selected)) return;
    if (tree.length > 0) {
      const firstNode = tree[0];
      if (firstNode) setSelected(firstNode.id);
    }
  }, [initialStateLoaded, nodes, selected, tree]);

  useEffect(() => {
    if (!bulkMode && bulkSelection.length) {
      setBulkSelection([]);
    }
  }, [bulkMode, bulkSelection.length]);

  useEffect(() => {
    trackAdminEvent('rotation_tree_bulk_mode', {
      rotationId,
      bulkMode,
      selectedCount: bulkSelection.length,
    });
  }, [bulkMode, bulkSelection.length, rotationId]);

  useEffect(() => {
    if (previewMode) {
      setBulkMode(false);
      setDraggingId(null);
      setDragOver(null);
    }
  }, [previewMode]);

  useEffect(() => {
    trackAdminEvent('rotation_tree_preview_mode', {
      rotationId,
      previewMode,
    });
  }, [previewMode, rotationId]);

  const highlight = useCallback((text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = trimmed.toLowerCase();
    const directIdx = lowerText.indexOf(lowerQuery);
    if (directIdx >= 0) {
      return (
        <span>
          {text.slice(0, directIdx)}
          <span className="bg-yellow-200 text-yellow-900 dark:bg-yellow-600/40 dark:text-yellow-100 font-semibold">
            {text.slice(directIdx, directIdx + trimmed.length)}
          </span>
          {text.slice(directIdx + trimmed.length)}
        </span>
      );
    }

    const matcher = createSynonymMatcher(trimmed);
    if (!matcher(text)) {
      return text;
    }

    return (
      <span className="bg-yellow-200 text-yellow-900 dark:bg-yellow-600/40 dark:text-yellow-100 font-semibold px-0.5 rounded">
        {text}
      </span>
    );
  }, []);

  const handleToggleBulk = useCallback((id: string, checked: boolean) => {
    setBulkSelection((prev) => {
      if (checked) return Array.from(new Set([...prev, id]));
      return prev.filter((value) => value !== id);
    });
  }, []);

  const handleDragStart = useCallback((id: string) => {
    setDraggingId(id);
  }, []);

  const handleDragCancel = useCallback(() => {
    setDraggingId(null);
    setDragOver(null);
  }, []);

  const handleDragOver = useCallback(
    (id: string, position: 'before' | 'after') => {
      if (draggingId === id) return;
      setDragOver({ id, position });
    },
    [draggingId],
  );

  const commitSiblingReorder = useCallback(
    async (parentId: string | null, orderedIds: string[], analytics: Record<string, unknown>) => {
      try {
        await reorderSiblings(parentId, orderedIds);
        await refresh();
        setToast({
          message: t('rotationTree.reordered', { defaultValue: 'Order updated' }),
          variant: 'success',
        });
        trackAdminEvent('rotation_tree_reordered', { rotationId, ...analytics });
      } catch (error) {
        handleError(
          error,
          'Failed to reorder rotation nodes',
          'rotationTree.error.reorder',
          'Failed to update order. Please try again.',
        );
      }
    },
    [handleError, refresh, rotationId, t],
  );

  const reorderNodes = useCallback(
    async (sourceId: string, targetId: string, position: 'before' | 'after') => {
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);
      if (!sourceNode || !targetNode) return;
      if (sourceNode.parentId !== targetNode.parentId) return;
      const parentId = sourceNode.parentId ?? null;
      const siblings = nodes
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      const sourceIndex = siblings.findIndex((n) => n.id === sourceId);
      const targetIndex = siblings.findIndex((n) => n.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return;
      const updated = [...siblings];
      const moved = updated.splice(sourceIndex, 1)[0];
      if (!moved) return;
      let insertIndex = targetIndex;
      if (position === 'after') {
        insertIndex = targetIndex + (sourceIndex < targetIndex ? 0 : 1);
      } else if (sourceIndex < targetIndex) {
        insertIndex = Math.max(targetIndex - 1, 0);
      }
      updated.splice(insertIndex, 0, moved);
      const orderedIds = updated.map((item) => item.id);
      await commitSiblingReorder(parentId, orderedIds, { sourceId, targetId, position });
    },
    [commitSiblingReorder, nodes],
  );

  const handleDrop = useCallback(
    async (id: string, position: 'before' | 'after') => {
      if (!draggingId) return;
      if (draggingId === id) {
        handleDragCancel();
        return;
      }
      await reorderNodes(draggingId, id, position);
      handleDragCancel();
    },
    [draggingId, handleDragCancel, reorderNodes],
  );

  const applyBulkUpdates = useCallback(
    async (updates: { requiredCount?: number; mcqUrl?: string }) => {
      const leaves = bulkSelectedNodes.filter((node) => node.type === 'leaf');
      if (!leaves.length) return;
      try {
        for (const leaf of leaves) {
          const payload: Partial<RotationNode> = {};
          if (typeof updates.requiredCount === 'number') {
            payload.requiredCount = updates.requiredCount;
          }
          if (typeof updates.mcqUrl === 'string') {
            payload.mcqUrl = updates.mcqUrl;
          }
          if (!Object.keys(payload).length) continue;
          await updateNode(leaf.id, payload);
        }
        await refresh();
        setBulkSelection([]);
        setToast({
          message: t('rotationTree.bulkSaved', { defaultValue: 'Bulk updates applied' }),
          variant: 'success',
        });
        trackAdminEvent('rotation_tree_bulk_update', {
          rotationId,
          affectedLeaves: leaves.length,
          updates,
        });
      } catch (error) {
        handleError(
          error,
          'Failed to apply bulk rotation node updates',
          'rotationTree.error.bulkSave',
          'Failed to apply bulk updates. Please try again.',
        );
        await refresh();
      }
    },
    [bulkSelectedNodes, handleError, refresh, rotationId, t],
  );

  const handleNodeChange = useCallback(
    async (node: RotationNode, updates: Partial<RotationNode>) => {
      try {
        await updateNode(node.id, updates);
        setNodes((prev) => prev.map((n) => (n.id === node.id ? { ...n, ...updates } : n)));
        setToast({
          message: t('rotationTree.saved', { defaultValue: 'Changes saved' }),
          variant: 'success',
        });
        trackAdminEvent('rotation_tree_node_saved', {
          rotationId,
          nodeId: node.id,
        });
      } catch (error) {
        handleError(
          error,
          'Failed to update rotation node',
          'rotationTree.error.save',
          'Failed to save changes. Please try again.',
        );
        await refresh();
      }
    },
    [handleError, refresh, rotationId, t],
  );

  const handleCreateChild = useCallback(
    async (parent: RotationNode, type: RotationNode['type']) => {
      try {
        const siblings = nodes.filter((n) => n.parentId === parent.id);
        await createNode({
          rotationId,
          parentId: parent.id,
          type,
          name: t('rotationTree.newNodeName', { defaultValue: 'New item' }),
          order: siblings.length,
        });
        await refresh();
        setToast({
          message: t('rotationTree.childCreated', { defaultValue: 'Child node added' }),
          variant: 'success',
        });
        trackAdminEvent('rotation_tree_child_created', {
          rotationId,
          parentId: parent.id,
          type,
        });
      } catch (error) {
        handleError(
          error,
          'Failed to create rotation node',
          'rotationTree.error.createChild',
          'Failed to add child node. Please try again.',
        );
      }
    },
    [handleError, nodes, refresh, rotationId, t],
  );

  const handleDeleteNode = useCallback(
    async (node: RotationNode) => {
      try {
        await deleteNode(node.id);
        await refresh();
        setSelected(null);
        setToast({
          message: t('rotationTree.nodeDeleted', { defaultValue: 'Node deleted' }),
          variant: 'success',
        });
        trackAdminEvent('rotation_tree_node_deleted', {
          rotationId,
          nodeId: node.id,
        });
      } catch (error) {
        handleError(
          error,
          'Failed to delete rotation node',
          'rotationTree.error.delete',
          'Failed to delete node. Please try again.',
        );
      }
    },
    [handleError, refresh, rotationId, t],
  );

  const handleMoveNode = useCallback(
    async (node: RotationNode, newParentId: string | null) => {
      try {
        await moveNode(node.id, newParentId);
        await refresh();
        setToast({
          message: t('rotationTree.nodeMoved', {
            defaultValue: 'Node moved to new parent',
          }),
          variant: 'success',
        });
        trackAdminEvent('rotation_tree_node_moved', {
          rotationId,
          nodeId: node.id,
          newParentId,
        });
      } catch (error) {
        handleError(
          error,
          'Failed to move rotation node',
          'rotationTree.error.move',
          'Failed to move node. Please try again.',
        );
      }
    },
    [handleError, refresh, rotationId, t],
  );

  const handleReorderDirection = useCallback(
    async (node: RotationNode, dir: 'up' | 'down') => {
      const siblings = nodes
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.order - b.order);
      const index = siblings.findIndex((s) => s.id === node.id);
      if (index < 0) return;
      const targetIndex = dir === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= siblings.length) return;
      const updated = [...siblings];
      const [moved] = updated.splice(index, 1);
      if (!moved) return;
      updated.splice(targetIndex, 0, moved);
      const orderedIds = updated.map((item) => item.id);
      await commitSiblingReorder(node.parentId ?? null, orderedIds, {
        nodeId: node.id,
        direction: dir,
      });
    },
    [commitSiblingReorder, nodes],
  );

  const leafCount = useMemo(() => nodes.filter((node) => node.type === 'leaf').length, [nodes]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={previewMode ? 'default' : 'outline'}
            onClick={() => setPreviewMode((prev) => !prev)}
          >
            {previewMode
              ? t('rotationTree.exitPreview', { defaultValue: 'Exit preview' })
              : t('rotationTree.previewMode', { defaultValue: 'Preview mode' })}
          </Button>
          <Button
            size="sm"
            variant={bulkMode ? 'default' : 'outline'}
            onClick={() => setBulkMode((prev) => !prev)}
            disabled={previewMode}
          >
            {t('rotationTree.bulkMode', { defaultValue: 'Bulk edit' })}
          </Button>
        </div>
        {bulkMode ? (
          <span className="text-xs text-muted">
            {t('rotationTree.bulkSelected', {
              defaultValue: '{{count}} selected',
              count: bulkSelection.length,
            })}
          </span>
        ) : (
          <span className="text-xs text-muted">
            {t('rotationTree.leafCount', {
              defaultValue: '{{count}} leaf activities',
              count: leafCount,
            })}
          </span>
        )}
      </div>

      <div className="rounded-lg border border-muted/30 bg-[rgb(var(--surface-elevated))] p-3 text-xs text-muted">
        {t('rotationTree.guidanceHelp', {
          defaultValue:
            'Tip: preview mode lets you share the curriculum structure without edit controls. Bulk edit is ideal for syncing requirements.',
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <aside className="rounded-md border-2 border-teal-300 bg-white p-3 dark:border-teal-700 dark:bg-[rgb(var(--surface))]">
          <div className="mb-3 border-b border-gray-200 pb-2 dark:border-[rgb(var(--border))]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-[rgb(var(--fg))]">
              📂 {t('rotationTree.structure', { defaultValue: 'Curriculum Structure' })}
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
              {previewMode
                ? t('rotationTree.previewHint', { defaultValue: 'Previewing curriculum layout' })
                : t('rotationTree.editHint', { defaultValue: 'Select a node to manage content' })}
            </p>
          </div>
          <div className="mb-3">
            <div className="relative">
              <input
                type="text"
                placeholder={t('ui.searchInCurriculum', { defaultValue: 'Search curriculum...' })}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="w-full rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
              />
              {searchTerm ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[rgb(var(--muted))] dark:hover:text-[rgb(var(--fg))]"
                  onClick={() => setSearchTerm('')}
                  aria-label={t('ui.clear', { defaultValue: 'Clear' })}
                >
                  ✕
                </button>
              ) : null}
            </div>
            {searchTerm ? (
              <div className="mt-1.5 text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
                {t('rotationTree.searchingFor', {
                  defaultValue: 'Searching for "{{term}}"',
                  term: searchTerm,
                })}
              </div>
            ) : null}
          </div>

          {tree.length === 0 ? (
            <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
              {t('rotationTree.emptyState', {
                defaultValue: 'No items yet. Import a template or add nodes manually.',
              })}
            </div>
          ) : (
            <TreeList
              nodes={tree}
              expanded={expanded}
              onToggle={(id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))}
              onSelect={setSelected}
              selectedId={selected}
              searchTerm={searchTerm}
              highlight={highlight}
              bulkMode={bulkMode}
              bulkSelection={bulkSelection}
              onToggleBulk={handleToggleBulk}
              previewMode={previewMode}
              draggingId={draggingId}
              dragOver={dragOver}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragCancel={handleDragCancel}
            />
          )}
        </aside>

        <section className="lg:col-span-2 rounded-md border-2 border-blue-300 bg-white p-4 dark:border-blue-700 dark:bg-[rgb(var(--surface))]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-3 dark:border-[rgb(var(--border))]">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-[rgb(var(--fg))]">
              {previewMode
                ? t('rotationTree.previewPanelTitle', { defaultValue: 'Preview node' })
                : t('rotationTree.editorPanelTitle', { defaultValue: 'Edit node' })}
            </h3>
            {current ? (
              <span className="text-xs text-muted">
                {t('rotationTree.nodeTypeLabel', {
                  defaultValue: 'Type: {{type}}',
                  type: current.type,
                })}
              </span>
            ) : null}
          </div>

          {!current ? (
            <div className="p-8 text-center">
              <div className="mb-4 text-6xl">👈</div>
              <div className="mb-2 text-lg font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                {t('rotationTree.selectNodeToEdit', { defaultValue: 'Select a node to edit' })}
              </div>
              <div className="text-sm text-gray-500 dark:text-[rgb(var(--muted))]">
                {t('rotationTree.selectNodeHint', {
                  defaultValue: 'Use the curriculum tree on the left to choose a node.',
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                {breadcrumb.map((crumb: RotationNode, index: number) => (
                  <span key={crumb.id} className="flex items-center gap-2">
                    {index > 0 ? <span>›</span> : null}
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-[rgb(var(--primary))] hover:bg-[rgb(var(--primary))]/10"
                      onClick={() => setSelected(crumb.id)}
                    >
                      {crumb.name}
                    </button>
                  </span>
                ))}
              </div>

              {guidanceText ? (
                <div className="mb-4 rounded-md border border-dashed border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-100">
                  {guidanceText}
                </div>
              ) : null}

              {bulkMode && bulkSelectedNodes.length ? (
                <BulkActionsPanel
                  nodes={bulkSelectedNodes}
                  onApply={applyBulkUpdates}
                  onCancel={() => setBulkSelection([])}
                />
              ) : previewMode ? (
                <NodePreview node={current} />
              ) : (
                <NodeEditor
                  key={current.id}
                  node={current}
                  nodes={nodes}
                  onChange={(data) => handleNodeChange(current, data)}
                  onCreateChild={(type) => handleCreateChild(current, type)}
                  onDelete={() => handleDeleteNode(current)}
                  onMoveParent={(newParentId) => handleMoveNode(current, newParentId)}
                  onReorder={(dir) => handleReorderDirection(current, dir)}
                />
              )}
            </>
          )}
        </section>
      </div>

      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
    </div>
  );
});

export default RotationTree;

/* Moved editor panels to ./tree/NodePanels.tsx
type NodeEditorProps = {
  node: RotationNode;
  nodes: RotationNode[];
  onChange: (d: Partial<RotationNode>) => Promise<void>;
  onCreateChild: (type: RotationNode['type']) => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveParent: (newParentId: string | null) => Promise<void>;
  onReorder: (dir: 'up' | 'down') => Promise<void>;
};

function NodeEditor({
  node,
  nodes,
  onChange,
  onCreateChild,
  onDelete,
  onMoveParent,
  onReorder,
}: NodeEditorProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(node.name);
  const isLeaf = node.type === 'leaf';
  const [requiredCount, setRequiredCount] = useState<number>(node.requiredCount || 0);
  const [mcqUrl, setMcqUrl] = useState<string>(node.mcqUrl || '');
  const [resources, setResources] = useState<string>(node.resources || '');
  const [links, setLinks] = useState<
    Array<{ label?: string; label_en?: string; label_he?: string; href: string }>
  >(node.links || []);
  const [notesEn, setNotesEn] = useState<string>(node.notes_en || '');
  const [notesHe, setNotesHe] = useState<string>(node.notes_he || '');
  const parentType = getParentType(node.type);
  const parentOptions = parentType
    ? nodes.filter((n) => n.type === parentType && n.rotationId === node.rotationId)
    : [];
  const siblings = nodes
    .filter((x) => x.parentId === node.parentId)
    .sort((a, b) => a.order - b.order);
  const idx = siblings.findIndex((s) => s.id === node.id);

  const renderMaterialsEditor = (variant: 'leaf' | 'branch') => {
    const title =
      variant === 'leaf'
        ? t('rotationTree.leafMaterialsTitle', { defaultValue: 'Activity resources' })
        : t('rotationTree.nodeMaterialsTitle', { defaultValue: 'Node resources' });
    const hint =
      variant === 'leaf'
        ? t('rotationTree.leafMaterialsHint', {
            defaultValue: 'Residents see these resources alongside this activity.',
          })
        : t('rotationTree.nodeMaterialsHint', {
            defaultValue: 'Residents will see these when they open this level.',
          });
    const containerClasses =
      variant === 'leaf'
        ? 'border-teal-200 bg-teal-50/40 dark:border-teal-800 dark:bg-teal-900/10'
        : 'border-blue-200 bg-blue-50/40 dark:border-blue-800 dark:bg-blue-900/10';

    return (
      <div className={`rounded-lg border-2 ${containerClasses} p-4`}>
        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">{title}</div>
            <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">{hint}</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-50">
              MCQ URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mcqUrl}
                onChange={(event) => setMcqUrl(event.target.value)}
                onBlur={async (event) => await onChange({ mcqUrl: event.target.value })}
                placeholder="https://forms.gle/..."
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
              />
              {mcqUrl ? (
                <a
                  className="px-3 py-2 text-sm text-teal-700 underline"
                  href={mcqUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t('rotationTree.open', { defaultValue: 'Open' })}
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-50">
              {t('rotationTree.resourcesLabel', { defaultValue: 'Resources' })}
            </label>
            <textarea
              value={resources}
              onChange={(event) => setResources(event.target.value)}
              onBlur={async (event) => await onChange({ resources: event.target.value })}
              placeholder="Books, videos, articles (one per line)"
              rows={3}
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
              {t('rotationTree.resourcesHint', {
                defaultValue: 'URLs will be auto-detected and made clickable.',
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('ui.name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={async () => {
            if (name !== node.name) {
              await onChange({ name });
            }
          }}
          placeholder="Enter node name"
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
        />
      </div>
      {parentType ? (
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">
            {t('rotationTree.parent')}
          </label>
          <Select value={node.parentId || ''} onChange={(e) => onMoveParent(e.target.value || null)}>
            <option value="" disabled>
              {t('rotationTree.selectParent', { defaultValue: 'Select parent' })}
            </option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={() => onReorder('up')} disabled={idx <= 0}>
          {t('rotationTree.moveUp', { defaultValue: 'Move up' })}
        </Button>
        <Button onClick={() => onReorder('down')} disabled={idx < 0 || idx >= siblings.length - 1}>
          {t('rotationTree.moveDown', { defaultValue: 'Move down' })}
        </Button>
      </div>
      {isLeaf ? (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-orange-200 bg-orange-50/30 p-4 dark:border-orange-800 dark:bg-orange-900/10">
            <label className="mb-1 block text-sm font-semibold text-orange-900 dark:text-orange-100">
              ⚡ {t('rotationTree.requiredCountLabel', { defaultValue: 'Required activities count' })}
            </label>
            <Input
              type="number"
              min="0"
              value={String(requiredCount)}
              onChange={(event) => setRequiredCount(Number(event.target.value))}
              onBlur={async () => onChange({ requiredCount })}
              className="text-lg font-bold"
            />
            <div className="mt-2 text-xs text-orange-800 dark:text-orange-200">
              {requiredCount === 0 ? (
                <div className="flex items-center gap-1">
                  <span>⚠️</span>
                  <span>
                    {t('rotationTree.noRequirement', {
                      defaultValue: "No requirement set - residents won't see this as a target",
                    })}
                  </span>
                </div>
              ) : (
                <div>
                  {t('rotationTree.requirementDescription', {
                    defaultValue:
                      'Residents must complete this activity {{count}} time{{plural}} to fulfill the requirement.',
                    count: requiredCount,
                    plural: requiredCount !== 1 ? 's' : '',
                  })}
                </div>
              )}
            </div>
          </div>
          {renderMaterialsEditor('leaf')}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-50">
              {t('rotationTree.notesEn', { defaultValue: 'Notes (English)' })}
            </label>
            <textarea
              value={notesEn}
              onChange={(event) => setNotesEn(event.target.value)}
              onBlur={async () => await onChange({ notes_en: notesEn })}
              placeholder="Clinical notes, tips, or additional information (max 500 chars)"
              rows={3}
              maxLength={500}
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
              {notesEn.length}/500
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900 dark:text-gray-50">
              {t('rotationTree.notesHe', { defaultValue: 'Notes (Hebrew)' })}
            </label>
            <textarea
              value={notesHe}
              onChange={(event) => setNotesHe(event.target.value)}
              onBlur={async () => await onChange({ notes_he: notesHe })}
              placeholder="הערות קליניות, טיפים או מידע נוסף (מקסימום 500 תווים)"
              rows={3}
              maxLength={500}
              dir="rtl"
              className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
            />
            <div className="mt-1 text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
              {notesHe.length}/500
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-50">
                {t('rotationTree.links', { defaultValue: 'Links' })}
              </span>
              <Button onClick={() => setLinks((arr) => [...arr, { label: 'Link', href: '' }])}>
                {t('rotationTree.addLink', { defaultValue: 'Add link' })}
              </Button>
            </div>
            {links.map((link, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={link.label || ''}
                  onChange={(event) =>
                    setLinks((arr) =>
                      arr.map((item, i) =>
                        i === idx ? { ...item, label: event.target.value } : item,
                      ),
                    )
                  }
                  onBlur={async () => await onChange({ links })}
                  className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={link.href}
                  onChange={(event) =>
                    setLinks((arr) =>
                      arr.map((item, i) =>
                        i === idx ? { ...item, href: event.target.value } : item,
                      ),
                    )
                  }
                  onBlur={async () => await onChange({ links })}
                  className="rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {renderMaterialsEditor('branch')}
          <div className="flex flex-wrap gap-2">
            {(['subject', 'topic', 'subTopic', 'subSubTopic', 'leaf'] as const)
              .filter((type) => canCreateChild(node.type, type))
              .map((type) => (
                <Button key={type} onClick={() => onCreateChild(type)}>
                  {t('rotationTree.addChild', { defaultValue: 'Add {{type}}', type })}
                </Button>
              ))}
          </div>
        </div>
      )}
      <div className="pt-2">
        <Button variant="destructive" onClick={onDelete}>
          {t('rotationTree.deleteNode', { defaultValue: 'Delete node' })}
        </Button>
      </div>
    </div>
  );
}

type BulkActionsPanelProps = {
  nodes: RotationNode[];
  onApply: (updates: { requiredCount?: number; mcqUrl?: string }) => Promise<void>;
  onCancel: () => void;
};

function BulkActionsPanel({ nodes, onApply, onCancel }: BulkActionsPanelProps) {
  const { t } = useTranslation();
  const [requiredCount, setRequiredCount] = useState('');
  const [mcqUrl, setMcqUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const leafCount = nodes.filter((node) => node.type === 'leaf').length;

  const handleApply = async () => {
    const updates: { requiredCount?: number; mcqUrl?: string } = {};
    if (requiredCount.trim() !== '') {
      const parsed = Number(requiredCount);
      if (Number.isNaN(parsed) || parsed < 0) return;
      updates.requiredCount = parsed;
    }
    if (mcqUrl.trim()) updates.mcqUrl = mcqUrl.trim();
    if (!Object.keys(updates).length) return;
    setSaving(true);
    await onApply(updates);
    setRequiredCount('');
    setMcqUrl('');
    setSaving(false);
  };

  return (
    <div className="mb-4 rounded-lg border-2 border-teal-200 bg-teal-50/70 p-4 dark:border-teal-800 dark:bg-teal-900/10">
      <div className="mb-2 text-sm font-semibold text-teal-900 dark:text-teal-100">
        {t('rotationTree.bulkEditorTitle', { defaultValue: 'Bulk edit selected leaves' })}
      </div>
      <p className="text-xs text-teal-900/80 dark:text-teal-100/80">
        {t('rotationTree.bulkEditorSummary', {
          defaultValue: 'Applying updates to {{count}} leaf item(s).',
          count: leafCount,
        })}
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs font-medium text-teal-900 dark:text-teal-100">
            {t('rotationTree.bulkRequiredCount', { defaultValue: 'Set required count' })}
          </label>
          <Input
            type="number"
            min="0"
            value={requiredCount}
            onChange={(e) => setRequiredCount(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-teal-900 dark:text-teal-100">
            {t('rotationTree.bulkMcqUrl', { defaultValue: 'Set shared MCQ URL' })}
          </label>
          <Input value={mcqUrl} onChange={(e) => setMcqUrl(e.target.value)} placeholder="https://..." />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" type="button" variant="ghost" onClick={onCancel}>
          {t('ui.cancel')}
        </Button>
        <Button size="sm" type="button" onClick={handleApply} loading={saving}>
          {t('rotationTree.applyBulk', { defaultValue: 'Apply changes' })}
        </Button>
      </div>
    </div>
  );
}

function NodePreview({ node }: { node: RotationNode }) {
  const { t } = useTranslation();
  const isLeaf = node.type === 'leaf';
  return (
    <div className="space-y-4">
      <div className="rounded-md border border-muted/40 bg-[rgb(var(--surface-elevated))] p-3">
        <div className="text-sm font-semibold text-[rgb(var(--fg))]">{node.name}</div>
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs text-muted md:grid-cols-2">
          <span>
            {t('rotationTree.nodeTypeLabel', { defaultValue: 'Type: {{type}}', type: node.type })}
          </span>
          {isLeaf ? (
            <span>
              {t('rotationTree.requiredCountLabel', {
                defaultValue: 'Required: {{count}}',
                count: node.requiredCount ?? 0,
              })}
            </span>
          ) : null}
          {node.mcqUrl ? (
            <span className="md:col-span-2">
              MCQ:{' '}
              <a
                href={node.mcqUrl}
                target="_blank"
                rel="noreferrer"
                className="break-all text-[rgb(var(--primary))] underline"
              >
                {node.mcqUrl}
              </a>
            </span>
          ) : null}
        </div>
      </div>
      {node.resources ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('rotationTree.resourcesLabel', { defaultValue: 'Resources' })}
          </div>
          <pre className="mt-1 whitespace-pre-wrap rounded-md border border-muted/30 bg-[rgb(var(--surface))] p-3 text-xs text-[rgb(var(--fg))]">
            {node.resources}
          </pre>
        </div>
      ) : null}
      {node.notes_en ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('rotationTree.notesEn', { defaultValue: 'Notes (English)' })}
          </div>
          <p className="mt-1 text-sm text-[rgb(var(--fg))]">{node.notes_en}</p>
        </div>
      ) : null}
      {node.notes_he ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('rotationTree.notesHe', { defaultValue: 'Notes (Hebrew)' })}
          </div>
          <p className="mt-1 text-sm text-[rgb(var(--fg))]" dir="rtl">
            {node.notes_he}
          </p>
        </div>
      ) : null}
      {node.links?.length ? (
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted">
            {t('rotationTree.links', { defaultValue: 'Links' })}
          </div>
          <ul className="mt-1 space-y-1 text-sm">
            {node.links.map((link, index) => (
              <li key={`${link.href}-${index}`}>
                <a
                  className="break-all text-[rgb(var(--primary))] underline"
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link.label || link.href}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function buildBreadcrumb(selectedId: string | null, nodes: RotationNode[]): RotationNode[] {
  if (!selectedId) return [];
  const map = new Map(nodes.map((node) => [node.id, node]));
  const path: RotationNode[] = [];
  let current = map.get(selectedId) || null;
  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) || null : null;
  }
  return path;
}

function guidanceForType(
  type: RotationNode['type'],
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  switch (type) {
    case 'category':
      return t('rotationTree.guidance.category', {
        defaultValue:
          'Categories frame major curriculum pillars. Add subjects underneath to break themes down.',
      });
    case 'subject':
      return t('rotationTree.guidance.subject', {
        defaultValue: 'Subjects group related topics. Keep names action-oriented to guide residents.',
      });
    case 'topic':
      return t('rotationTree.guidance.topic', {
        defaultValue: 'Topics outline focus areas. Add sub-topics to scaffold progression.',
      });
    case 'subTopic':
      return t('rotationTree.guidance.subTopic', {
        defaultValue: 'Subtopics house targeted practice. Use clear verbs to describe expectations.',
      });
    case 'subSubTopic':
      return t('rotationTree.guidance.subSubTopic', {
        defaultValue: 'Detail the building blocks beneath each subtopic. Tie them to measurable outcomes.',
      });
    case 'leaf':
      return t('rotationTree.guidance.leaf', {
        defaultValue:
          'Leaves represent actual activities. Set a required count, resources, and links so residents know how to execute.',
      });
    default:
      return '';
  }
}

function canCreateChild(parent: RotationNode['type'], child: RotationNode['type']): boolean {
  const order = ['category', 'subject', 'topic', 'subTopic', 'subSubTopic', 'leaf'] as const;
  return order.indexOf(child as any) > order.indexOf(parent as any);
}

function getParentType(type: RotationNode['type']): RotationNode['type'] | null {
  switch (type) {
    case 'category':
      return null;
    case 'subject':
      return 'category';
    case 'topic':
      return 'subject';
    case 'subTopic':
      return 'topic';
    case 'subSubTopic':
      return 'subTopic';
    case 'leaf':
      return 'subSubTopic';
    default:
      return null;
  }
}
*/

function buildBreadcrumb(selectedId: string | null, nodes: RotationNode[]): RotationNode[] {
  if (!selectedId) return [];
  const map = new Map(nodes.map((node) => [node.id, node]));
  const path: RotationNode[] = [];
  let current = map.get(selectedId) || null;
  while (current) {
    path.unshift(current);
    current = current.parentId ? map.get(current.parentId) || null : null;
  }
  return path;
}
