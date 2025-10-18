'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  createNode,
  deleteNode,
  listRotationNodes,
  moveNode,
  reorderSiblings,
  updateNode,
} from '../../../lib/firebase/admin';
import type { RotationNode } from '../../../types/rotations';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';
import Select from '../../ui/Select';

type Props = { rotationId: string };

type TreeNode = RotationNode & { children: TreeNode[] };

export default function RotationTree({ rotationId }: Props) {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<RotationNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    (async () => {
      const n = await listRotationNodes(rotationId);
      setNodes(n);
      // Start with all categories collapsed
      setExpanded({});
    })();
  }, [rotationId]);

  const tree = useMemo(() => buildTree(nodes), [nodes]);

  // Auto-expand nodes that contain search matches
  useEffect(() => {
    if (!searchTerm.trim()) return;

    const newExpanded: Record<string, boolean> = {};
    const needle = searchTerm.toLowerCase();

    function hasMatchingDescendant(node: TreeNode): boolean {
      if (node.name.toLowerCase().includes(needle)) return true;
      return node.children.some(hasMatchingDescendant);
    }

    function expandMatching(node: TreeNode) {
      if (hasMatchingDescendant(node)) {
        newExpanded[node.id] = true;
        node.children.forEach(expandMatching);
      }
    }

    tree.forEach(expandMatching);
    setExpanded((prev) => ({ ...prev, ...newExpanded }));
  }, [searchTerm, tree]);

  const current = nodes.find((n) => n.id === selected) || null;

  async function refresh() {
    const fresh = await listRotationNodes(rotationId);
    setNodes(fresh);
  }

  // Highlight matching text in search results
  function highlight(text: string, query: string) {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx < 0) return text;
    return (
      <span>
        {text.slice(0, idx)}
        <span className="bg-yellow-200 text-yellow-900 dark:bg-yellow-600/40 dark:text-yellow-100 font-semibold">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </span>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* LEFT PANEL: Tree Navigation */}
      <div className="lg:col-span-1 rounded-md border-2 border-teal-300 dark:border-teal-700 bg-white dark:bg-[rgb(var(--surface))] p-3">
        <div className="mb-3 pb-2 border-b border-gray-200 dark:border-[rgb(var(--border))]">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-[rgb(var(--fg))]">
            📂 Curriculum Structure
          </h3>
          <p className="text-xs text-gray-500 dark:text-[rgb(var(--muted))] mt-1">Click any item to edit →</p>
        </div>

        {/* Search Bar */}
        <div className="mb-3">
          <div className="relative">
            <input
              type="text"
              placeholder={t('ui.searchInCurriculum') || 'Search curriculum...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))] text-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[rgb(var(--muted))] dark:hover:text-[rgb(var(--fg))] text-lg font-bold leading-none"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          {searchTerm && (
            <div className="text-xs text-gray-500 dark:text-[rgb(var(--muted))] mt-1.5 px-1">
              🔍 Searching for "{searchTerm}"
            </div>
          )}
        </div>

        {tree.length === 0 ? (
          <div className="text-sm text-amber-600 dark:text-amber-400 p-4 bg-amber-50 dark:bg-amber-900/20 rounded">
            No items yet. Import a CSV or create nodes manually.
          </div>
        ) : (
          tree.map((n) => (
            <NodeItem
              key={n.id}
              node={n}
              level={0}
              expanded={expanded}
              onToggle={(id) => setExpanded((s) => ({ ...s, [id]: !s[id] }))}
              onSelect={setSelected}
              selectedId={selected}
              categoryColor={null}
              searchTerm={searchTerm}
              highlight={highlight}
              parentName={undefined}
            />
          ))
        )}
      </div>

      {/* RIGHT PANEL: Node Editor */}
      <div className="lg:col-span-2 rounded-md border-2 border-blue-300 dark:border-blue-700 bg-white dark:bg-[rgb(var(--surface))] p-4">
        <div className="mb-4 pb-3 border-b border-gray-200 dark:border-[rgb(var(--border))]">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-[rgb(var(--fg))]">✏️ Edit Node</h3>
        </div>
        {!current ? (
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">👈</div>
            <div className="text-lg font-medium text-gray-700 dark:text-[rgb(var(--fg))] mb-2">
              {t('rotationTree.selectNodeToEdit') || 'Select a node to edit'}
            </div>
            <div className="text-sm text-gray-500 dark:text-[rgb(var(--muted))]">
              Click on any item in the tree to view and edit its details
            </div>
          </div>
        ) : (
          <NodeEditor
            key={current.id}
            node={current}
            nodes={nodes}
            onChange={async (data) => {
              await updateNode(current.id, data as any);
              setNodes((arr) => arr.map((x) => (x.id === current.id ? { ...x, ...data } : x)));
            }}
            onCreateChild={async (type) => {
              const siblings = nodes.filter((x) => x.parentId === current.id);
              await createNode({
                id: '' as any,
                rotationId,
                parentId: current.id,
                type,
                name: 'New',
                order: siblings.length,
              } as any);
              await refresh();
            }}
            onDelete={async () => {
              await deleteNode(current.id);
              await refresh();
              setSelected(null);
            }}
            onMoveParent={async (newParentId) => {
              await moveNode(current.id, newParentId);
              await refresh();
            }}
            onReorder={async (dir) => {
              const siblings = nodes
                .filter((x) => x.parentId === current.parentId)
                .sort((a, b) => a.order - b.order);
              const idx = siblings.findIndex((s) => s.id === current.id);
              const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
              if (idx < 0 || targetIdx < 0 || targetIdx >= siblings.length) return;
              const swapped: RotationNode[] = [...siblings];
              const tmp = swapped[idx]!.order;
              swapped[idx]!.order = swapped[targetIdx]!.order;
              swapped[targetIdx]!.order = tmp;
              const orderedIds = swapped.sort((a, b) => a.order - b.order).map((s) => s.id);
              await reorderSiblings(current.parentId ?? null, orderedIds);
              await refresh();
            }}
          />
        )}
      </div>
    </div>
  );
}

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
}: {
  node: TreeNode;
  level: number;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  selectedId: string | null;
  categoryColor: { bg: string; border: string; baseColor: string } | null;
  searchTerm: string;
  highlight: (text: string, query: string) => React.ReactNode;
  parentName?: string;
}) {
  const isExpanded = Boolean(expanded[node.id]);
  const hasChildren = node.children.length > 0;
  const isCategory = node.type === 'category';
  const isLeaf = node.type === 'leaf';

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

  return (
    <div className="pl-2">
      <div
        className={
          'flex items-center gap-2 py-1.5 px-2 rounded cursor-pointer transition-colors ' +
          (selectedId === node.id
            ? 'bg-teal-50 dark:bg-teal-900/30 '
            : 'hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] ') +
          bgClass
        }
        onClick={() => {
          if (hasChildren) onToggle(node.id);
          onSelect(node.id);
        }}
      >
        {hasChildren ? (
          <span className="text-xs text-gray-600 dark:text-[rgb(var(--muted))] select-none">
            {isExpanded ? '▾' : '▸'}
          </span>
        ) : (
          <span className="text-xs text-transparent">▸</span>
        )}
        <span
          className={`text-sm text-gray-900 dark:text-gray-50 ${isCategory ? 'font-semibold' : ''} ${isDuplicateName ? 'text-gray-500 dark:text-[rgb(var(--muted))] italic' : ''}`}
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
        {node.type !== 'leaf' ? (
          // Branch nodes: Show total required count from all child leaves
          (() => {
            const totals = branchTotals(node);
            return (
              <Badge
                variant="secondary"
                className="ml-auto text-xs font-bold px-2.5 py-1 !bg-blue-100 !text-blue-800 dark:!bg-blue-900/60 dark:!text-blue-200 border border-blue-300 dark:border-blue-700"
                title={`Total activities required: ${totals.totalRequired} (from ${totals.leafCount} items)`}
              >
                Σ {totals.totalRequired}
              </Badge>
            );
          })()
        ) : node.requiredCount ? (
          // Leaf nodes: Show required count prominently
          <Badge
            variant="secondary"
            className="ml-auto text-xs font-bold px-2.5 py-1 !bg-orange-100 !text-orange-800 dark:!bg-orange-900/60 dark:!text-orange-200 border border-orange-300 dark:border-orange-700"
            title={`Required activities: ${node.requiredCount}`}
          >
            ⚡ {node.requiredCount}
          </Badge>
        ) : (
          // Leaf with no required count - show warning
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
            .map((c) => (
              <NodeItem
                key={c.id}
                node={c as TreeNode}
                level={level + 1}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                selectedId={selectedId}
                categoryColor={currentCategoryColor}
                searchTerm={searchTerm}
                highlight={highlight}
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

function NodeEditor({
  node,
  nodes,
  onChange,
  onCreateChild,
  onDelete,
  onMoveParent,
  onReorder,
}: {
  node: RotationNode;
  nodes: RotationNode[];
  onChange: (d: Partial<RotationNode>) => Promise<void>;
  onCreateChild: (type: RotationNode['type']) => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveParent: (newParentId: string | null) => Promise<void>;
  onReorder: (dir: 'up' | 'down') => Promise<void>;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(node.name);
  const isLeaf = node.type === 'leaf';
  const [requiredCount, setRequiredCount] = useState<number>(node.requiredCount || 0);
  const [mcqUrl, setMcqUrl] = useState<string>(node.mcqUrl || '');
  const [links, setLinks] = useState<Array<{ label?: string; label_en?: string; label_he?: string; href: string }>>(node.links || []);
  const [resources, setResources] = useState<string>(node.resources || '');
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
        />
      </div>
      {parentType ? (
        <div>
          <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">{t('rotationTree.parent')}</label>
          <Select
            value={node.parentId || ''}
            onChange={(e) => onMoveParent(e.target.value || null)}
          >
            <option value="" disabled>
              Select parent
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
          Move up
        </Button>
        <Button onClick={() => onReorder('down')} disabled={idx < 0 || idx >= siblings.length - 1}>
          Move down
        </Button>
      </div>
      {!isLeaf ? (
        <div className="flex flex-wrap gap-2">
          {(['subject', 'topic', 'subTopic', 'subSubTopic', 'leaf'] as const)
            .filter((t) => canCreateChild(node.type, t))
            .map((t) => (
              <Button key={t} onClick={() => onCreateChild(t)}>
                Add {t}
              </Button>
            ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10 p-4">
            <label className="block text-sm font-semibold text-orange-900 dark:text-orange-100 mb-1">
              ⚡ Required Activities Count
            </label>
            <Input
              type="number"
              min="0"
              value={String(requiredCount)}
              onChange={(e) => setRequiredCount(Number(e.target.value))}
              onBlur={async () => onChange({ requiredCount })}
              className="text-lg font-bold"
            />
            <div className="text-xs text-orange-800 dark:text-orange-200 mt-2">
              {requiredCount === 0 ? (
                <div className="flex items-center gap-1">
                  <span>⚠️</span>
                  <span>No requirement set - residents won't see this as a target</span>
                </div>
              ) : (
                <div>
                  Residents must complete this activity <strong>{requiredCount}</strong> time
                  {requiredCount !== 1 ? 's' : ''} to fulfill the requirement.
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">MCQ URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={mcqUrl}
                onChange={(e) => setMcqUrl(e.target.value)}
                onBlur={async () => await onChange({ mcqUrl })}
                placeholder="https://forms.gle/..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
              />
              {mcqUrl ? (
                <a
                  className="text-sm text-teal-700 underline px-3 py-2"
                  href={mcqUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">Resources</label>
            <textarea
              value={resources}
              onChange={(e) => setResources(e.target.value)}
              onBlur={async () => await onChange({ resources })}
              placeholder="Books, videos, articles (one per line)"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))] font-mono text-sm resize-y"
            />
            <div className="text-xs text-gray-500 dark:text-[rgb(var(--muted))] mt-1">
              Add books, videos, or other reference materials. URLs will be auto-detected and made
              clickable.
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">Notes (English)</label>
            <textarea
              value={notesEn}
              onChange={(e) => setNotesEn(e.target.value)}
              onBlur={async () => await onChange({ notes_en: notesEn })}
              placeholder="Clinical notes, tips, or additional information (max 500 chars)"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))] resize-y"
            />
            <div className="text-xs text-gray-500 dark:text-[rgb(var(--muted))] mt-1">{notesEn.length}/500 characters</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 dark:text-gray-50 mb-2">Notes (Hebrew)</label>
            <textarea
              value={notesHe}
              onChange={(e) => setNotesHe(e.target.value)}
              onBlur={async () => await onChange({ notes_he: notesHe })}
              placeholder="הערות קליניות, טיפים או מידע נוסף (מקסימום 500 תווים)"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))] resize-y"
              dir="rtl"
            />
            <div className="text-xs text-gray-500 dark:text-[rgb(var(--muted))] mt-1">{notesHe.length}/500 characters</div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-50">Links</span>
              <Button onClick={() => setLinks((arr) => [...arr, { label: 'Link', href: '' }])}>
                Add link
              </Button>
            </div>
            {links.map((lnk, idx) => (
              <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Label"
                  value={lnk.label || ''}
                  onChange={(e) =>
                    setLinks((arr) =>
                      arr.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)),
                    )
                  }
                  onBlur={async () => await onChange({ links })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
                />
                <input
                  type="text"
                  placeholder="URL"
                  value={lnk.href}
                  onChange={(e) =>
                    setLinks((arr) =>
                      arr.map((x, i) => (i === idx ? { ...x, href: e.target.value } : x)),
                    )
                  }
                  onBlur={async () => await onChange({ links })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="pt-2">
        <Button variant="destructive" onClick={onDelete}>
          Delete node
        </Button>
      </div>
    </div>
  );
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

function branchTotals(node: TreeNode): { totalRequired: number; leafCount: number } {
  // Compute totals: sum of leaf requiredCounts and count of leaves
  let totalRequired = 0;
  let leafCount = 0;
  function walk(n: TreeNode) {
    if (n.type === 'leaf') {
      totalRequired += n.requiredCount || 0;
      leafCount += 1;
    }
    n.children.forEach(walk);
  }
  walk(node);
  return { totalRequired, leafCount };
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
