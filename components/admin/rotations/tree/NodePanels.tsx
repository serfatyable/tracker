'use client';

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RotationNode } from '../../../../types/rotations';
import Button from '../../../ui/Button';
import Input from '../../../ui/Input';
import Select from '../../../ui/Select';

export type NodeEditorProps = {
  node: RotationNode;
  nodes: RotationNode[];
  onChange: (d: Partial<RotationNode>) => Promise<void>;
  onCreateChild: (type: RotationNode['type']) => Promise<void>;
  onDelete: () => Promise<void>;
  onMoveParent: (newParentId: string | null) => Promise<void>;
  onReorder: (dir: 'up' | 'down') => Promise<void>;
};

export function NodeEditor({
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

  const siblings = useMemo(
    () =>
      nodes
        .filter((candidate) => candidate.parentId === node.parentId)
        .sort((a, b) => a.order - b.order),
    [nodes, node.parentId],
  );

  const idx = siblings.findIndex((s) => s.id === node.id);

  const parentOptions = useMemo(() => {
    if (!parentType) return [];
    return nodes.filter((candidate) => candidate.type === parentType);
  }, [nodes, parentType]);

  const renderMaterialsEditor = (mode: 'leaf' | 'branch') => (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-50">
          {mode === 'leaf'
            ? t('rotationTree.resourcesLabel', { defaultValue: 'Resident instructions' })
            : t('rotationTree.branchResourcesLabel', { defaultValue: 'Branch overview' })}
        </label>
        <textarea
          value={resources}
          onChange={(event) => setResources(event.target.value)}
          onBlur={async () => await onChange({ resources })}
          rows={mode === 'leaf' ? 6 : 4}
          placeholder={
            mode === 'leaf'
              ? t('rotationTree.resourcesPlaceholder', {
                  defaultValue:
                    'Provide clinical instructions, tips, and references that help residents perform this activity.',
                })
              : t('rotationTree.branchResourcesPlaceholder', {
                  defaultValue:
                    'Describe the intent of this branch. What should residents accomplish before moving on?',
                })
          }
          className="w-full resize-y rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-[rgb(var(--surface-depressed))] dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('rotationTree.mcqUrlLabel', { defaultValue: 'MCQ / Self-assessment URL' })}
        </label>
        <Input
          value={mcqUrl}
          onChange={(event) => setMcqUrl(event.target.value)}
          onBlur={async () => onChange({ mcqUrl })}
          placeholder="https://"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-gray-50">
          {t('rotationTree.nodeName', { defaultValue: 'Node name' })}
        </label>
        <Input
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
          <Select
            value={node.parentId || ''}
            onChange={(e) => onMoveParent(e.target.value || null)}
          >
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
              ⚡{' '}
              {t('rotationTree.requiredCountLabel', { defaultValue: 'Required activities count' })}
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

export type BulkActionsPanelProps = {
  nodes: RotationNode[];
  onApply: (updates: { requiredCount?: number; mcqUrl?: string }) => Promise<void>;
  onCancel: () => void;
};

export function BulkActionsPanel({ nodes, onApply, onCancel }: BulkActionsPanelProps) {
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
          <Input
            value={mcqUrl}
            onChange={(e) => setMcqUrl(e.target.value)}
            placeholder="https://..."
          />
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

export function NodePreview({ node }: { node: RotationNode }) {
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

export function guidanceForType(
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
        defaultValue:
          'Subjects group related topics. Keep names action-oriented to guide residents.',
      });
    case 'topic':
      return t('rotationTree.guidance.topic', {
        defaultValue: 'Topics outline focus areas. Add sub-topics to scaffold progression.',
      });
    case 'subTopic':
      return t('rotationTree.guidance.subTopic', {
        defaultValue:
          'Subtopics house targeted practice. Use clear verbs to describe expectations.',
      });
    case 'subSubTopic':
      return t('rotationTree.guidance.subSubTopic', {
        defaultValue:
          'Detail the building blocks beneath each subtopic. Tie them to measurable outcomes.',
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
