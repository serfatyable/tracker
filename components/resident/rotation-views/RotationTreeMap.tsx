'use client';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Node, Edge } from 'reactflow';
import ReactFlow, { Background, Controls, MiniMap, Position, Panel } from 'reactflow';

import 'reactflow/dist/style.css';
import { useResidentProgress, type NodeProgress } from '../../../lib/hooks/useResidentProgress';
import { useRotationNodes } from '../../../lib/hooks/useRotationNodes';
import { useUserTasks } from '@/lib/react-query/hooks';
import { getLocalized } from '../../../lib/i18n/getLocalized';
import { createSynonymMatcher } from '../../../lib/search/synonyms';
import TextField from '../../ui/TextField';

interface RotationTreeMapProps {
  rotationId: string;
  onSelectNode: (nodeId: string) => void;
}

type FilterType = 'all' | 'incomplete' | 'inProgress' | 'completed';

export default function RotationTreeMap({ rotationId, onSelectNode }: RotationTreeMapProps) {
  const { t } = useTranslation();
  const { nodes: rotationNodes } = useRotationNodes(rotationId);
  const { tasks } = useUserTasks();
  const { roots } = useResidentProgress(rotationId, tasks, rotationNodes);

  // State for expanded nodes (start with root expanded to show categories)
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Toggle node expansion
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Get all descendant leaf IDs for a node
  const getDescendantLeaves = useCallback((node: NodeProgress): string[] => {
    const leaves: string[] = [];
    function traverse(n: NodeProgress) {
      if (n.children.length === 0 && n.requiredCount > 0) {
        leaves.push(n.id);
      } else {
        n.children.forEach(traverse);
      }
    }
    traverse(node);
    return leaves;
  }, []);

  // Build React Flow nodes and edges with expand/collapse logic
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Calculate total progress for root
    const totalApproved = roots.reduce((sum, r) => sum + r.approvedCount, 0);
    const totalRequired = roots.reduce((sum, r) => sum + r.requiredCount, 0);
    const totalPercent = totalRequired > 0 ? Math.round((totalApproved / totalRequired) * 100) : 0;

    // Apply filters
    const shouldShowNode = (node: NodeProgress): boolean => {
      if (!node.requiredCount) return false;
      const percent = node.requiredCount > 0 ? (node.approvedCount / node.requiredCount) * 100 : 0;

      switch (filter) {
        case 'incomplete':
          return percent < 100;
        case 'inProgress':
          return percent > 0 && percent < 100;
        case 'completed':
          return percent >= 100;
        default:
          return true;
      }
    };

    // Apply search filter
    const searchMatcher = createSynonymMatcher(searchTerm);
    const hasSearch = searchTerm.trim().length > 0;

    const matchesSearch = (node: NodeProgress): boolean => {
      if (!hasSearch) return true;
      const label =
        getLocalized<string>({
          he: (node as any).name_he as any,
          en: (node as any).name_en as any,
          fallback: node.name as any,
          lang: 'en',
        }) || node.name;
      return searchMatcher(label);
    };

    // Root node
    flowNodes.push({
      id: 'root',
      type: 'customNode',
      position: { x: 500, y: 0 },
      data: {
        label: t('resident.rotation', { defaultValue: 'Rotation' }),
        approvedCount: totalApproved,
        requiredCount: totalRequired,
        percent: totalPercent,
        isRoot: true,
        isExpanded: expandedNodes.has('root'),
        hasChildren: roots.length > 0,
        nodeType: 'root',
        isHighlighted: highlightedNodes.has('root'),
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    // Only show categories if root is expanded
    if (expandedNodes.has('root')) {
      const filteredRoots = roots.filter((r) => shouldShowNode(r) && matchesSearch(r));
      const categorySpacing = 300;
      const startX = 500 - ((filteredRoots.length - 1) * categorySpacing) / 2;

      filteredRoots.forEach((cat, idx) => {
        const x = startX + idx * categorySpacing;
        const y = 150;

        const catPercent =
          cat.requiredCount > 0 ? Math.round((cat.approvedCount / cat.requiredCount) * 100) : 0;

        flowNodes.push({
          id: cat.id,
          type: 'customNode',
          position: { x, y },
          data: {
            label:
              getLocalized<string>({
                he: (cat as any).name_he as any,
                en: (cat as any).name_en as any,
                fallback: cat.name as any,
                lang: 'en',
              }) || cat.name,
            approvedCount: cat.approvedCount,
            requiredCount: cat.requiredCount,
            percent: catPercent,
            isExpanded: expandedNodes.has(cat.id),
            hasChildren: cat.children.length > 0,
            nodeType: 'category',
            isHighlighted: highlightedNodes.has(cat.id),
          },
          sourcePosition: Position.Bottom,
          targetPosition: Position.Top,
        });

        flowEdges.push({
          id: `root-${cat.id}`,
          source: 'root',
          target: cat.id,
          type: 'smoothstep',
          animated: false,
        });

        // Recursively add children if expanded
        if (expandedNodes.has(cat.id)) {
          layoutChildren(
            cat,
            x,
            y + 150,
            flowNodes,
            flowEdges,
            0,
            expandedNodes,
            highlightedNodes,
            shouldShowNode,
            matchesSearch,
          );
        }
      });
    }

    return { nodes: flowNodes, edges: flowEdges };
  }, [roots, expandedNodes, highlightedNodes, filter, searchTerm, t]);

  const onNodeClick = useCallback(
    (event: any, node: Node) => {
      const isLeaf = !node.data.hasChildren;

      if (isLeaf) {
        // Navigate to browse view for leaves
        onSelectNode(node.id);
      } else {
        // For categories/subjects: expand and highlight descendants
        toggleExpand(node.id);

        // Find the node in the tree and highlight all its leaves
        const findNode = (nodes: NodeProgress[], id: string): NodeProgress | null => {
          for (const n of nodes) {
            if (n.id === id) return n;
            const found = findNode(n.children, id);
            if (found) return found;
          }
          return null;
        };

        const targetNode = findNode(roots, node.id);
        if (targetNode) {
          const leaves = getDescendantLeaves(targetNode);
          setHighlightedNodes(new Set(leaves));
        }
      }
    },
    [onSelectNode, toggleExpand, roots, getDescendantLeaves],
  );

  // Custom node types
  const nodeTypes = useMemo(
    () => ({
      customNode: CustomNodeComponent,
    }),
    [],
  );

  return (
    <div className="h-[600px] border rounded-lg bg-gray-50 dark:bg-[rgb(var(--bg))] overflow-hidden relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={1.5}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const percent = node.data.percent || 0;
            if (percent === 100) return '#22c55e';
            if (percent > 0) return '#3b82f6';
            return '#9ca3af';
          }}
          className="!bg-gray-100 dark:!bg-gray-800"
        />

        {/* Collapsible Filter Panel */}
        <Panel position="top-right">
          {isPanelCollapsed ? (
            // Collapsed state - just a button
            <button
              onClick={() => setIsPanelCollapsed(false)}
              className="bg-white dark:bg-[rgb(var(--surface))] p-2 rounded-lg shadow-lg border border-gray-200 dark:border-[rgb(var(--border))] hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] transition"
              title={t('resident.showFilters', { defaultValue: 'Show Filters' })}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-600 dark:text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </button>
          ) : (
            // Expanded state - full panel
            <div className="bg-white dark:bg-[rgb(var(--surface))] p-3 rounded-lg shadow-lg border border-gray-200 dark:border-[rgb(var(--border))] space-y-3 max-w-[180px]">
              {/* Header with collapse button */}
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('resident.controls', { defaultValue: 'Controls' })}
                </div>
                <button
                  onClick={() => setIsPanelCollapsed(true)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition"
                  title={t('resident.hideFilters', { defaultValue: 'Hide Filters' })}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Hierarchy Legend */}
              <div>
                <div className="text-xs font-semibold text-gray-700 dark:text-[rgb(var(--fg))] mb-2">
                  {t('resident.hierarchy', { defaultValue: 'Hierarchy' })}
                </div>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-purple-600 dark:bg-purple-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Root</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-cyan-600 dark:bg-cyan-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Category</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-orange-600 dark:bg-orange-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Subject</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-4 bg-pink-600 dark:bg-pink-400 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Topic</span>
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-[rgb(var(--border))]"></div>

              <div>
                <div className="text-xs font-semibold text-gray-700 dark:text-[rgb(var(--fg))] mb-2">
                  {t('resident.filters', { defaultValue: 'Filters' })}
                </div>

                {/* Search */}
                <TextField
                  placeholder={t('resident.search', { defaultValue: 'Search...' })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="text-sm mb-2"
                />

                {/* Filter buttons */}
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`text-xs px-2 py-1 rounded transition ${
                      filter === 'all'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] hover:bg-gray-200 dark:hover:bg-[rgb(var(--surface-depressed))]'
                    }`}
                  >
                    {t('resident.all', { defaultValue: 'All' })}
                  </button>
                  <button
                    onClick={() => setFilter('incomplete')}
                    className={`text-xs px-2 py-1 rounded transition ${
                      filter === 'incomplete'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] hover:bg-gray-200 dark:hover:bg-[rgb(var(--surface-depressed))]'
                    }`}
                  >
                    {t('resident.incomplete', { defaultValue: 'Incomplete' })}
                  </button>
                  <button
                    onClick={() => setFilter('inProgress')}
                    className={`text-xs px-2 py-1 rounded transition ${
                      filter === 'inProgress'
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] hover:bg-gray-200 dark:hover:bg-[rgb(var(--surface-depressed))]'
                    }`}
                  >
                    {t('resident.inProgress', { defaultValue: 'In Progress' })}
                  </button>
                  <button
                    onClick={() => setFilter('completed')}
                    className={`text-xs px-2 py-1 rounded transition ${
                      filter === 'completed'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] hover:bg-gray-200 dark:hover:bg-[rgb(var(--surface-depressed))]'
                    }`}
                  >
                    {t('resident.completed', { defaultValue: 'Completed' })}
                  </button>
                </div>
              </div>
            </div>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Custom Node Component with tooltips and better styling
function CustomNodeComponent({ data }: { data: any }) {
  const percent =
    data.requiredCount > 0 ? Math.round((data.approvedCount / data.requiredCount) * 100) : 0;

  // Status-based background colors
  let bgColor = 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))]';
  let borderColor = 'border-gray-400 dark:border-gray-600';
  let textColor = 'text-gray-900 dark:text-gray-100';
  let progressColor = 'bg-gray-500';

  if (data.isHighlighted) {
    bgColor = 'bg-yellow-100 dark:bg-yellow-900/40';
    borderColor = 'border-yellow-500 dark:border-yellow-400';
  } else if (data.requiredCount > 0) {
    if (percent === 100) {
      bgColor = 'bg-green-100 dark:bg-green-900/40';
      borderColor = 'border-green-500';
      textColor = 'text-green-900 dark:text-green-100';
      progressColor = 'bg-green-500';
    } else if (percent > 0) {
      bgColor = 'bg-blue-100 dark:bg-blue-900/40';
      borderColor = 'border-blue-500';
      textColor = 'text-blue-900 dark:text-blue-100';
      progressColor = 'bg-blue-500';
    }
  }

  // Hierarchy-based left border colors
  let leftBorderColor = '';
  let leftBorderWidth = 'border-l-4';

  switch (data.nodeType) {
    case 'root':
      leftBorderColor = 'border-l-purple-600 dark:border-l-purple-400';
      leftBorderWidth = 'border-l-[6px]';
      break;
    case 'category':
      leftBorderColor = 'border-l-cyan-600 dark:border-l-cyan-400';
      leftBorderWidth = 'border-l-[5px]';
      break;
    case 'subject':
      leftBorderColor = 'border-l-orange-600 dark:border-l-orange-400';
      break;
    case 'topic':
      leftBorderColor = 'border-l-pink-600 dark:border-l-pink-400';
      break;
    case 'leaf':
      leftBorderColor = 'border-l-gray-400 dark:border-l-gray-500';
      leftBorderWidth = 'border-l-2';
      break;
    default:
      leftBorderColor = 'border-l-gray-400 dark:border-l-gray-500';
  }

  // Symbol based on node type
  const getSymbol = () => {
    if (data.nodeType === 'root') return '◉';
    if (data.nodeType === 'category') return '◉';
    if (data.hasChildren) return '◎';
    return '○';
  };

  // Expansion indicator
  const expandIcon = data.hasChildren ? (data.isExpanded ? '▼' : '▶') : null;

  const isLeaf = !data.hasChildren;

  // Calculate stats for tooltip
  const notStarted = data.requiredCount - data.approvedCount;
  const _inProgress = data.approvedCount > 0 && data.approvedCount < data.requiredCount;

  return (
    <div
      className={`relative px-4 py-3 rounded-lg border-2 ${leftBorderWidth} ${bgColor} ${borderColor} ${leftBorderColor} ${
        isLeaf ? 'cursor-pointer hover:shadow-lg' : 'cursor-pointer hover:shadow-md'
      } transition-all min-w-[160px] max-w-[220px]`}
      title={`${data.label}\n✓ ${data.approvedCount} completed\n○ ${notStarted} remaining\nTotal: ${data.approvedCount}/${data.requiredCount} (${percent}%)\n${isLeaf ? 'Click to view details' : 'Click to expand/collapse'}`}
    >
      {/* Expansion indicator */}
      {expandIcon && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 text-xs text-gray-600 dark:text-gray-400">
          {expandIcon}
        </div>
      )}

      {/* Header with symbol and label */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{getSymbol()}</span>
        <div className={`font-semibold text-sm ${textColor} ${data.isRoot ? 'text-base' : ''}`}>
          {data.label}
        </div>
      </div>

      {/* Progress info */}
      {data.requiredCount > 0 && (
        <>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
            {data.approvedCount}/{data.requiredCount} ({percent}%)
          </div>
          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${progressColor} rounded-full transition-all`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to layout children recursively
function layoutChildren(
  parent: NodeProgress,
  baseX: number,
  baseY: number,
  nodes: Node[],
  edges: Edge[],
  depth: number,
  expandedNodes: Set<string>,
  highlightedNodes: Set<string>,
  shouldShowNode: (node: NodeProgress) => boolean,
  matchesSearch: (node: NodeProgress) => boolean,
) {
  if (parent.children.length === 0) return;

  const filteredChildren = parent.children.filter((c) => shouldShowNode(c) && matchesSearch(c));
  if (filteredChildren.length === 0) return;

  const childSpacing = Math.max(200, 280 - depth * 20);
  const startX = baseX - ((filteredChildren.length - 1) * childSpacing) / 2;

  filteredChildren.forEach((child, idx) => {
    const x = startX + idx * childSpacing;
    const y = baseY;

    const percent =
      child.requiredCount > 0 ? Math.round((child.approvedCount / child.requiredCount) * 100) : 0;

    const isLeaf = child.children.length === 0;
    const nodeType = isLeaf ? 'leaf' : depth === 0 ? 'subject' : 'topic';

    nodes.push({
      id: child.id,
      type: 'customNode',
      position: { x, y },
      data: {
        label:
          getLocalized<string>({
            he: (child as any).name_he as any,
            en: (child as any).name_en as any,
            fallback: child.name as any,
            lang: 'en',
          }) || child.name,
        approvedCount: child.approvedCount,
        requiredCount: child.requiredCount,
        percent,
        isExpanded: expandedNodes.has(child.id),
        hasChildren: child.children.length > 0,
        nodeType,
        isHighlighted: highlightedNodes.has(child.id),
      },
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
    });

    edges.push({
      id: `${parent.id}-${child.id}`,
      source: parent.id,
      target: child.id,
      type: 'smoothstep',
      animated: false,
      style: highlightedNodes.has(child.id) ? { stroke: '#eab308', strokeWidth: 2 } : undefined,
    });

    // Recursively layout deeper children if expanded and depth limit not reached
    if (expandedNodes.has(child.id) && child.children.length > 0 && depth < 4) {
      layoutChildren(
        child,
        x,
        y + 150,
        nodes,
        edges,
        depth + 1,
        expandedNodes,
        highlightedNodes,
        shouldShowNode,
        matchesSearch,
      );
    }
  });
}
