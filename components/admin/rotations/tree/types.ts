import type { RotationNode } from '../../../../types/rotations';

export type TreeNode = RotationNode & { children: TreeNode[] };

export type DragState = { id: string; position: 'before' | 'after' } | null;
