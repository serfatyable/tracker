"use client";

import { useEffect, useMemo, useState } from 'react';
import Button from '../../ui/Button';
import Badge from '../../ui/Badge';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import type { RotationNode } from '../../../types/rotations';
import { createNode, deleteNode, listRotationNodes, moveNode, reorderSiblings, updateNode } from '../../../lib/firebase/admin';

type Props = { rotationId: string };

type TreeNode = RotationNode & { children: TreeNode[] };

export default function RotationTree({ rotationId }: Props) {
    const [nodes, setNodes] = useState<RotationNode[]>([]);
    const [selected, setSelected] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    useEffect(() => {
        (async () => {
            const n = await listRotationNodes(rotationId);
            setNodes(n);
            const rootCats = n.filter((x)=> x.parentId === null);
            const exp: Record<string, boolean> = {};
            rootCats.forEach((c)=>{ exp[c.id] = true; });
            setExpanded(exp);
        })();
    }, [rotationId]);

    const tree = useMemo(() => buildTree(nodes), [nodes]);

    const current = nodes.find((n)=> n.id === selected) || null;

    async function refresh() {
        const fresh = await listRotationNodes(rotationId);
        setNodes(fresh);
    }

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <div className="lg:col-span-1 rounded-md border border-gray-200 dark:border-gray-800 p-2">
                {tree.map((n)=> (
                    <NodeItem key={n.id} node={n} level={0} expanded={expanded} onToggle={(id)=> setExpanded((s)=> ({...s, [id]: !s[id]}))} onSelect={setSelected} selectedId={selected} />
                ))}
            </div>
            <div className="lg:col-span-2 rounded-md border border-gray-200 dark:border-gray-800 p-4">
                {!current ? (
                    <div className="text-sm text-gray-500">Select a node to edit</div>
                ) : (
                    <NodeEditor key={current.id} node={current} nodes={nodes} onChange={async (data)=>{
                        await updateNode(current.id, data as any);
                        setNodes((arr)=> arr.map((x)=> x.id===current.id ? ({...x, ...data}) : x));
                    }} onCreateChild={async (type)=>{
                        const siblings = nodes.filter((x)=> x.parentId === current.id);
                        const created = await createNode({
                            id: '' as any,
                            rotationId,
                            parentId: current.id,
                            type,
                            name: 'New',
                            order: siblings.length,
                        } as any);
                        await refresh();
                    }} onDelete={async ()=>{
                        await deleteNode(current.id);
                        await refresh();
                        setSelected(null);
                    }} onMoveParent={async (newParentId)=>{
                        await moveNode(current.id, newParentId);
                        await refresh();
                    }} onReorder={async (dir)=>{
                        const siblings = nodes.filter((x)=> x.parentId === current.parentId).sort((a,b)=> a.order - b.order);
                        const idx = siblings.findIndex((s)=> s.id === current.id);
                        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
                        if (idx < 0 || targetIdx < 0 || targetIdx >= siblings.length) return;
                        const swapped: RotationNode[] = [...siblings];
                        const tmp = swapped[idx]!.order;
                        swapped[idx]!.order = swapped[targetIdx]!.order;
                        swapped[targetIdx]!.order = tmp;
                        const orderedIds = swapped.sort((a,b)=> a.order - b.order).map((s)=> s.id);
                        await reorderSiblings(current.parentId ?? null, orderedIds);
                        await refresh();
                    }} />
                )}
            </div>
        </div>
    );
}

function NodeItem({ node, level, expanded, onToggle, onSelect, selectedId }: { node: TreeNode; level: number; expanded: Record<string, boolean>; onToggle: (id: string)=> void; onSelect: (id: string)=> void; selectedId: string | null }) {
    const isExpanded = Boolean(expanded[node.id]);
    const hasChildren = node.children.length > 0;
    return (
        <div className="pl-2">
            <div className={"flex items-center gap-2 py-1 rounded cursor-pointer " + (selectedId===node.id ? "bg-teal-50 dark:bg-gray-800" : "")}
                onClick={()=> onSelect(node.id)}>
                {hasChildren ? (
                    <button className="text-xs text-gray-600" onClick={(e)=> { e.stopPropagation(); onToggle(node.id); }}>{isExpanded ? '▾' : '▸'}</button>
                ) : <span className="text-xs text-transparent">▸</span>}
                <span className="text-sm">{node.name}</span>
                {node.type !== 'leaf' ? (
                    <Badge className="ml-auto">{branchTotals(node).join(' / ')}</Badge>
                ) : null}
            </div>
            {hasChildren && isExpanded ? (
                <div className="pl-4">
                    {node.children.sort((a,b)=> a.order - b.order).map((c)=> (
                        <NodeItem key={c.id} node={c as TreeNode} level={level+1} expanded={expanded} onToggle={onToggle} onSelect={onSelect} selectedId={selectedId} />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

function buildTree(nodes: RotationNode[]): TreeNode[] {
    const map: Record<string, TreeNode> = {};
    nodes.forEach((n)=> { (map[n.id] = { ...(n as any), children: [] }); });
    const roots: TreeNode[] = [];
    nodes.forEach((n)=> {
        if (n.parentId) {
            const parent = map[n.parentId];
            if (parent && map[n.id]) parent.children.push(map[n.id]!);
        } else {
            if (map[n.id]) roots.push(map[n.id]!);
        }
    });
    return roots.sort((a,b)=> a.order - b.order);
}

function NodeEditor({ node, nodes, onChange, onCreateChild, onDelete, onMoveParent, onReorder }: { node: RotationNode; nodes: RotationNode[]; onChange: (d: Partial<RotationNode>)=> Promise<void>; onCreateChild: (type: RotationNode['type'])=> Promise<void>; onDelete: ()=> Promise<void>; onMoveParent: (newParentId: string | null)=> Promise<void>; onReorder: (dir: 'up'|'down')=> Promise<void> }) {
    const [name, setName] = useState(node.name);
    const isLeaf = node.type === 'leaf';
    const [requiredCount, setRequiredCount] = useState<number>(node.requiredCount || 0);
    const [mcqUrl, setMcqUrl] = useState<string>(node.mcqUrl || '');
    const [links, setLinks] = useState<Array<{ label: string; href: string }>>(node.links || []);
    const parentType = getParentType(node.type);
    const parentOptions = parentType ? nodes.filter((n)=> n.type === parentType && n.rotationId === node.rotationId) : [];
    const siblings = nodes.filter((x)=> x.parentId === node.parentId).sort((a,b)=> a.order - b.order);
    const idx = siblings.findIndex((s)=> s.id === node.id);

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium">Name</label>
                <Input value={name} onChange={(e)=> setName(e.target.value)} onBlur={async ()=> name!==node.name && onChange({ name })} />
            </div>
            {parentType ? (
                <div>
                    <label className="block text-sm font-medium">Parent</label>
                    <Select value={node.parentId || ''} onChange={(e)=> onMoveParent(e.target.value || null)}>
                        <option value="" disabled>Select parent</option>
                        {parentOptions.map((p)=> (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </Select>
                </div>
            ) : null}
            <div className="flex gap-2">
                <Button onClick={()=> onReorder('up')} disabled={idx <= 0}>Move up</Button>
                <Button onClick={()=> onReorder('down')} disabled={idx < 0 || idx >= siblings.length - 1}>Move down</Button>
            </div>
            {!isLeaf ? (
                <div className="flex flex-wrap gap-2">
                    {(['subject','topic','subTopic','subSubTopic','leaf'] as const).filter((t)=> canCreateChild(node.type, t)).map((t)=> (
                        <Button key={t} onClick={()=> onCreateChild(t)}>Add {t}</Button>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium">Required Count</label>
                        <Input type="number" value={String(requiredCount)} onChange={(e)=> setRequiredCount(Number(e.target.value))} onBlur={async ()=> onChange({ requiredCount })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">MCQ URL</label>
                        <div className="flex gap-2">
                            <Input value={mcqUrl} onChange={(e)=> setMcqUrl(e.target.value)} onBlur={async ()=> onChange({ mcqUrl })} />
                            {mcqUrl ? <a className="text-sm text-teal-700 underline" href={mcqUrl} target="_blank" rel="noreferrer">Open</a> : null}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Links</span>
                            <Button onClick={()=> setLinks((arr)=> [...arr, { label: 'Link', href: '' }])}>Add link</Button>
                        </div>
                        {links.map((lnk, idx)=> (
                            <div key={idx} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Input placeholder="Label" value={lnk.label} onChange={(e)=> setLinks((arr)=> arr.map((x,i)=> i===idx ? ({...x, label: e.target.value}) : x))} onBlur={async ()=> onChange({ links })} />
                                <Input placeholder="URL" value={lnk.href} onChange={(e)=> setLinks((arr)=> arr.map((x,i)=> i===idx ? ({...x, href: e.target.value}) : x))} onBlur={async ()=> onChange({ links })} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <div className="pt-2">
                <Button variant="destructive" onClick={onDelete}>Delete node</Button>
            </div>
        </div>
    );
}

function canCreateChild(parent: RotationNode['type'], child: RotationNode['type']): boolean {
    const order = ['category','subject','topic','subTopic','subSubTopic','leaf'] as const;
    return order.indexOf(child as any) > order.indexOf(parent as any);
}

function getParentType(type: RotationNode['type']): RotationNode['type'] | null {
    switch (type) {
        case 'category': return null;
        case 'subject': return 'category';
        case 'topic': return 'subject';
        case 'subTopic': return 'topic';
        case 'subSubTopic': return 'subTopic';
        case 'leaf': return 'subSubTopic';
        default: return null;
    }
}

function branchTotals(node: TreeNode): number[] {
    // Compute simple totals: sum of leaf requiredCounts under this node grouped by category depth
    const totals = { leafs: 0 } as any;
    function walk(n: TreeNode) {
        if (n.type === 'leaf') totals.leafs += (n.requiredCount || 0);
        n.children.forEach(walk);
    }
    walk(node);
    return [totals.leafs];
}


