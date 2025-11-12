'use client';

import type { ReactNode } from 'react';

import Badge from '../../../ui/Badge';

import type { DragState, TreeNode } from './types';

export type TreeListProps = {
  nodes: TreeNode[];
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  searchTerm: string;
  highlight: (text: string, query: string) => ReactNode;
  bulkMode: boolean;
  bulkSelection: string[];
  onToggleBulk: (id: string, checked: boolean) => void;
  previewMode: boolean;
  draggingId: string | null;
  dragOver: DragState;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: 'before' | 'after') => void;
  onDrop: (id: string, position: 'before' | 'after') => void;
  onDragCancel: () => void;
};

export function TreeList({
  nodes,
  expanded,
  onToggle,
  onSelect,
  selectedId,
  searchTerm,
  highlight,
  bulkMode,
  bulkSelection,
  onToggleBulk,
  previewMode,
  draggingId,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragCancel,
}: TreeListProps) {
  return (
    <div className="space-y-1">
      {nodes
        .sort((a, b) => a.order - b.order)
        .map((node) => (
          <NodeItem
            key={node.id}
            node={node}
            level={0}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            selectedId={selectedId}
            categoryColor={getCategoryColor(node.name)}
            searchTerm={searchTerm}
            highlight={highlight}
            bulkMode={bulkMode}
            bulkSelection={bulkSelection}
            onToggleBulk={onToggleBulk}
            previewMode={previewMode}
            draggingId={draggingId}
            dragOver={dragOver}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragCancel={onDragCancel}
          />
        ))}
    </div>
  );
}

type NodeItemProps = {
  node: TreeNode;
  level: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  categoryColor: { bg: string; border: string; baseColor: string } | null;
  searchTerm: string;
  highlight: (text: string, query: string) => ReactNode;
  parentName?: string;
  bulkMode: boolean;
  bulkSelection: string[];
  onToggleBulk: (id: string, checked: boolean) => void;
  previewMode: boolean;
  draggingId: string | null;
  dragOver: DragState;
  onDragStart: (id: string) => void;
  onDragOver: (id: string, position: 'before' | 'after') => void;
  onDrop: (id: string, position: 'before' | 'after') => void;
  onDragCancel: () => void;
};

function NodeItem({
  node,
  level,
  expanded,
  onToggle,
  onSelect,
  selectedId,
  categoryColor,
  searchTerm,
  highlight,
  parentName,
  bulkMode,
  bulkSelection,
  onToggleBulk,
  previewMode,
  draggingId,
  dragOver,
  onDragStart,
  onDragOver,
  onDrop,
  onDragCancel,
}: NodeItemProps) {
  const isExpanded = Boolean(expanded[node.id]);
  const hasChildren = node.children.length > 0;
  const isCategory = node.type === 'category';
  const isLeaf = node.type === 'leaf';
  const hasMaterials =
    Boolean((node.resources || '').trim()) ||
    Boolean((node.mcqUrl || '').trim()) ||
    (Array.isArray(node.links) && node.links.length > 0);
  const isDuplicateName =
    isLeaf && parentName && node.name.toLowerCase().trim() === parentName.toLowerCase().trim();
  const currentCategoryColor = isCategory ? getCategoryColor(node.name) : categoryColor;

  let bgClass = '';
  if (currentCategoryColor) {
    if (isCategory) {
      bgClass = `${currentCategoryColor.bg} ${currentCategoryColor.border}`;
    } else if (node.type === 'subject') {
      if (currentCategoryColor.baseColor === 'blue') {
        bgClass = 'bg-blue-50/50 dark:bg-blue-950/15';
      } else if (currentCategoryColor.baseColor === 'green') {
        bgClass = 'bg-green-50/50 dark:bg-green-950/15';
      } else if (currentCategoryColor.baseColor === 'purple') {
        bgClass = 'bg-purple-50/50 dark:bg-purple-950/15';
      }
    } else if (currentCategoryColor.baseColor === 'blue') {
      bgClass = 'bg-blue-50/30 dark:bg-blue-950/10';
    } else if (currentCategoryColor.baseColor === 'green') {
      bgClass = 'bg-green-50/30 dark:bg-green-950/10';
    } else if (currentCategoryColor.baseColor === 'purple') {
      bgClass = 'bg-purple-50/30 dark:bg-purple-950/10';
    }
  }

  const showCheckbox = bulkMode && isLeaf;
  const isSelected = selectedId === node.id;
  const isDragTarget = dragOver?.id === node.id;
  const dragIndicatorStyle =
    isDragTarget && !previewMode && !bulkMode
      ? {
          boxShadow:
            dragOver?.position === 'before'
              ? 'inset 0 2px 0 0 rgba(45,212,191,0.65)'
              : 'inset 0 -2px 0 0 rgba(45,212,191,0.65)',
        }
      : undefined;

  return (
    <div className="pl-2">
      <div
        className={
          'flex items-center gap-2 rounded px-2 py-1.5 transition-colors ' +
          (isSelected
            ? 'bg-teal-50 dark:bg-teal-900/30 '
            : 'hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] ') +
          bgClass +
          (previewMode || bulkMode ? '' : ' cursor-move')
        }
        style={dragIndicatorStyle}
        draggable={!previewMode && !bulkMode}
        onDragStart={(event) => {
          if (previewMode || bulkMode) return;
          onDragStart(node.id);
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', node.id);
        }}
        onDragOver={(event) => {
          if (!draggingId || previewMode || bulkMode) return;
          if (draggingId === node.id) return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
          onDragOver(node.id, position);
        }}
        onDrop={(event) => {
          if (!draggingId || previewMode || bulkMode) return;
          if (draggingId === node.id) return;
          event.preventDefault();
          const bounds = event.currentTarget.getBoundingClientRect();
          const position = event.clientY < bounds.top + bounds.height / 2 ? 'before' : 'after';
          onDrop(node.id, position);
        }}
        onDragEnd={onDragCancel}
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect(node.id);
        }}
      >
        {hasChildren ? (
          <span className="select-none text-xs text-gray-600 dark:text-[rgb(var(--muted))]">
            {isExpanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="select-none text-xs text-transparent">▸</span>
        )}
        {showCheckbox ? (
          <input
            type="checkbox"
            checked={bulkSelection.includes(node.id)}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => onToggleBulk(node.id, event.target.checked)}
          />
        ) : null}
        <span
          className={`text-sm text-gray-900 dark:text-gray-50 ${isCategory ? 'font-semibold' : ''} ${
            isDuplicateName ? 'italic text-gray-500 dark:text-[rgb(var(--muted))]' : ''
          }`}
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
        {hasMaterials ? (
          <Badge
            variant="secondary"
            className="ml-1 flex-shrink-0 border border-sky-200 text-[10px] font-semibold !bg-sky-100 !text-sky-700 dark:border-sky-700 dark:!bg-sky-900/40 dark:!text-sky-100"
            title="Contains materials"
          >
            🔗
          </Badge>
        ) : null}
        {node.type !== 'leaf' ? (
          (() => {
            const totals = branchTotals(node);
            return (
              <Badge
                variant="secondary"
                className="ml-auto border border-blue-300 text-xs font-bold !bg-blue-100 !text-blue-800 dark:!bg-blue-900/60 dark:!text-blue-200 dark:border-blue-700"
                title={`Total activities required: ${totals.totalRequired} (from ${totals.leafCount} items)`}
              >
                Σ {totals.totalRequired}
              </Badge>
            );
          })()
        ) : node.requiredCount ? (
          <Badge
            variant="secondary"
            className="ml-auto border border-orange-300 text-xs font-bold !bg-orange-100 !text-orange-800 dark:!bg-orange-900/60 dark:!text-orange-200 dark:border-orange-700"
            title={`Required activities: ${node.requiredCount}`}
          >
            ⚡ {node.requiredCount}
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="ml-auto text-xs !bg-gray-100 !text-gray-600 dark:!bg-[rgb(var(--surface-elevated))] dark:!text-[rgb(var(--muted))]"
            title="No required count set"
          >
            —
          </Badge>
        )}
      </div>
      {hasChildren && isExpanded ? (
        <div className="pl-4">
          {node.children
            .sort((a, b) => a.order - b.order)
            .map((child) => (
              <NodeItem
                key={child.id}
                node={child as TreeNode}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedId={selectedId}
                categoryColor={currentCategoryColor}
                searchTerm={searchTerm}
                highlight={highlight}
                parentName={node.name}
                bulkMode={bulkMode}
                bulkSelection={bulkSelection}
                onToggleBulk={onToggleBulk}
                previewMode={previewMode}
                draggingId={draggingId}
                dragOver={dragOver}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragCancel={onDragCancel}
              />
            ))}
        </div>
      ) : null}
    </div>
  );
}

export function branchTotals(node: TreeNode): { totalRequired: number; leafCount: number } {
  if (node.type === 'leaf') {
    return { totalRequired: node.requiredCount ?? 0, leafCount: 1 };
  }

  return node.children.reduce(
    (acc, child) => {
      const totals = branchTotals(child);
      acc.totalRequired += totals.totalRequired;
      acc.leafCount += totals.leafCount;
      return acc;
    },
    { totalRequired: 0, leafCount: 0 },
  );
}

export function getCategoryColor(
  name: string,
): { bg: string; border: string; baseColor: string } | null {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes('core') || normalized.includes('foundation')) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/40',
      border: 'border border-blue-200 dark:border-blue-700',
      baseColor: 'blue',
    };
  }
  if (normalized.includes('advanced') || normalized.includes('elective')) {
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/40',
      border: 'border border-purple-200 dark:border-purple-700',
      baseColor: 'purple',
    };
  }
  if (normalized.includes('clinic') || normalized.includes('skills')) {
    return {
      bg: 'bg-green-50 dark:bg-green-950/40',
      border: 'border border-green-200 dark:border-green-700',
      baseColor: 'green',
    };
  }
  return {
    bg: 'bg-slate-50 dark:bg-slate-900/50',
    border: 'border border-slate-200 dark:border-slate-800',
    baseColor: 'blue',
  };
}
