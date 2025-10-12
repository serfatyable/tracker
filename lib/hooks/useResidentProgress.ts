'use client';

import { useMemo } from 'react';
import type { RotationNode } from '../../types/rotations';
import type { TaskDoc } from '../firebase/db';

export type NodeProgress = {
  id: string;
  name: string;
  type: RotationNode['type'];
  requiredCount: number;
  approvedCount: number;
  pendingCount: number;
  children: NodeProgress[];
};

export function useResidentProgress(
  rotationId: string | null,
  tasks: TaskDoc[],
  nodes: RotationNode[],
) {
  return useMemo(() => {
    const inRotation = rotationId ? nodes.filter((n) => n.rotationId === rotationId) : [];

    // Map task counts by leaf id
    const countsByItemId: Record<string, { approved: number; pending: number }> = {};
    tasks
      .filter((t) => !rotationId || t.rotationId === rotationId)
      .forEach((t) => {
        const bucket = (countsByItemId[t.itemId] = countsByItemId[t.itemId] || {
          approved: 0,
          pending: 0,
        });
        if (t.status === 'approved') bucket.approved += Number(t.count || 0);
        else if (t.status === 'pending') bucket.pending += Number(t.count || 0);
      });

    // Build tree
    const tree = buildTree(inRotation);

    // Compute progress per node (bottom-up)
    function compute(node: RotationNode): NodeProgress {
      if (node.type === 'leaf') {
        const c = countsByItemId[node.id] || { approved: 0, pending: 0 };
        return {
          id: node.id,
          name: node.name,
          type: node.type,
          requiredCount: Number(node.requiredCount || 0),
          approvedCount: c.approved,
          pendingCount: c.pending,
          children: [],
        };
      }
      const children: NodeProgress[] = (node as any).__children.map((c: RotationNode) => compute(c));
      const requiredCount = children.reduce((acc, ch) => acc + ch.requiredCount, 0);
      const approvedCount = children.reduce((acc, ch) => acc + ch.approvedCount, 0);
      const pendingCount = children.reduce((acc, ch) => acc + ch.pendingCount, 0);
      return {
        id: node.id,
        name: node.name,
        type: node.type,
        requiredCount,
        approvedCount,
        pendingCount,
        children,
      };
    }

    const roots = tree.map((r) => compute(r));
    const totals = roots.reduce<{ required: number; approved: number; pending: number }>(
      (acc: { required: number; approved: number; pending: number }, r: NodeProgress) => {
        acc.required += r.requiredCount;
        acc.approved += r.approvedCount;
        acc.pending += r.pendingCount;
        return acc;
      },
      { required: 0, approved: 0, pending: 0 },
    );
    const percent =
      totals.required > 0
        ? Math.min(100, Math.round((totals.approved / totals.required) * 100))
        : 0;

    return { roots, totals: { ...totals, percent } } as const;
  }, [rotationId, tasks, nodes]);
}

function buildTree(nodes: RotationNode[]): RotationNode[] {
  const map: Record<string, RotationNode & { __children: RotationNode[] }> = {};
  nodes.forEach((n) => {
    map[n.id] = { ...(n as any), __children: [] };
  });
  const roots: (RotationNode & { __children: RotationNode[] })[] = [];
  nodes.forEach((n) => {
    const cur = map[n.id]!;
    if (n.parentId) {
      const p = map[n.parentId];
      if (p) p.__children.push(cur);
    } else {
      roots.push(cur);
    }
  });
  roots.sort((a, b) => a.order - b.order);
  roots.forEach((r) => sortDeep(r));
  return roots as unknown as RotationNode[];
}

function sortDeep(n: any) {
  n.__children.sort((a: any, b: any) => a.order - b.order);
  n.__children.forEach(sortDeep);
}
