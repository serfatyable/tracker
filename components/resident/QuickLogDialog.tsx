'use client';
import { getAuth } from 'firebase/auth';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask, getFirstTutorIdForResident } from '../../lib/firebase/db';
import { submitReflection } from '../../lib/hooks/useReflections';
import { useLatestPublishedTemplate } from '../../lib/hooks/useReflectionTemplates';
import { logError } from '../../lib/utils/logger';
import type { RotationNode } from '../../types/rotations';
import ReflectionForm from '../reflections/ReflectionForm';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

type QuickLogDialogProps = {
  open: boolean;
  onClose: () => void;
  leaf: RotationNode | null;
  onLog: (leaf: RotationNode, count: number, note?: string) => Promise<void> | void;
  leafOptions?: Array<{
    id: string;
    node: RotationNode;
    title: string;
    trail?: string;
  }>;
  recentLeaves?: Array<{
    id: string;
    node: RotationNode;
    title: string;
    trail?: string;
  }>;
  onSelectLeaf?: (leaf: RotationNode | null) => void;
};

export default function QuickLogDialog({
  open,
  onClose,
  leaf,
  onLog,
  leafOptions = [],
  recentLeaves = [],
  onSelectLeaf,
}: QuickLogDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<RotationNode | null>(leaf);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alsoLogReflection, setAlsoLogReflection] = useState(false);
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [submittingReflection, setSubmittingReflection] = useState(false);

  // Get reflection template
  const taskType = selected?.name || 'Task';
  const { template } = useLatestPublishedTemplate('resident', taskType);

  useEffect(() => setSelected(leaf), [leaf]);

  useEffect(() => {
    if (!open) {
      // Reset all state when dialog closes
      setCount(1);
      setNote('');
      setSearch('');
      setAlsoLogReflection(false);
      setShowReflectionForm(false);
      setCreatedTaskId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const filteredLeaves = useMemo(() => {
    if (!leafOptions.length) return [] as typeof leafOptions;
    const term = search.trim().toLowerCase();
    if (!term) return leafOptions;
    return leafOptions.filter((opt) => {
      const title = opt.title.toLowerCase();
      const trail = opt.trail ? opt.trail.toLowerCase() : '';
      return title.includes(term) || trail.includes(term);
    });
  }, [leafOptions, search]);

  const handleLeafPick = (node: RotationNode) => {
    setSelected(node);
    onSelectLeaf?.(node);
  };

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    try {
      setSubmitting(true);
      const trimmedNote = note.trim();

      // If reflection is enabled, create task internally to get task ID
      // Don't call onLog yet - we'll call it after reflection is submitted
      if (alsoLogReflection) {
        const auth = getAuth(getFirebaseApp());
        const uid = auth.currentUser?.uid;
        if (!uid) {
          throw new Error('User not authenticated');
        }
        const result = await createTask({
          userId: uid,
          rotationId: selected.rotationId,
          itemId: selected.id,
          count: count || 1,
          requiredCount: selected.requiredCount || 0,
          note: trimmedNote || undefined,
        });
        setCreatedTaskId(result.id);
        setShowReflectionForm(true);
        // Don't call onLog here - wait until reflection is submitted
      } else {
        await onLog(selected, count, trimmedNote ? trimmedNote : undefined);
        setCount(1);
        setNote('');
        onClose();
      }
    } catch (error) {
      console.error('Failed to log activity from quick dialog', error);
      logError('Failed to log activity from quick dialog', 'QuickLogDialog', error as Error);
    } finally {
      setSubmitting(false);
    }
  };

  async function handleReflectionSubmit(answers: Record<string, string>) {
    const auth = getAuth(getFirebaseApp());
    const uid = auth.currentUser?.uid;
    if (!uid || !createdTaskId || !selected || !template) return;

    setSubmittingReflection(true);
    try {
      const tutorId = await getFirstTutorIdForResident(uid);
      await submitReflection({
        taskOccurrenceId: createdTaskId,
        taskType: taskType,
        templateKey: template.templateKey,
        templateVersion: template.version || 1,
        authorId: uid,
        authorRole: 'resident',
        residentId: uid,
        tutorId: tutorId,
        answers,
      });

      // Note: We don't call onLog here because the task was already created above.
      // The UI will refresh naturally when the user navigates or the page refreshes.
      // If needed, the parent component can listen for task creation events.

      setShowReflectionForm(false);
      setAlsoLogReflection(false);
      setCreatedTaskId(null);
      setCount(1);
      setNote('');
      onClose();
    } catch (error) {
      logError('Failed to submit reflection', 'QuickLogDialog', error as Error);
    } finally {
      setSubmittingReflection(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] p-4 flex items-end sm:items-center justify-center bg-black/30">
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border bg-white dark:bg-[rgb(var(--surface))] border-gray-200 dark:border-[rgb(var(--border))] shadow-lg p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {showReflectionForm
              ? t('reflections.writeReflection', { defaultValue: 'Write Reflection' })
              : t('ui.logActivity', { defaultValue: 'Log activity' })}
          </div>
          <button
            onClick={onClose}
            disabled={submitting || submittingReflection}
            className="h-8 w-8 grid place-items-center rounded hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={t('ui.close')}
          >
            ×
          </button>
        </div>
        <div className="space-y-3">
          {!selected ? (
            <div>
              <div className="text-xs mb-1 text-gray-600 dark:text-gray-300">
                {t('ui.selectLeaf', { defaultValue: 'Select a leaf to view details' })}
              </div>
              <div className="space-y-3">
                {leafOptions.length > 8 ? (
                  <TextField
                    placeholder={t('ui.searchItems', { defaultValue: 'Search items' }) as string}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="text-sm"
                  />
                ) : null}
                {search.trim().length === 0 && recentLeaves.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      {t('ui.recentItems', { defaultValue: 'Recent items' })}
                    </div>
                    <div className="space-y-1.5">
                      {recentLeaves.map((r) => (
                        <button
                          key={`recent-${r.id}`}
                          className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-left hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                          onClick={() => handleLeafPick(r.node)}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                            {r.title}
                          </div>
                          {r.trail ? (
                            <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {r.trail}
                            </div>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="space-y-1">
                  <div className="text-[11px] uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {t('ui.allItems', { defaultValue: 'All items' })}
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-auto pr-1">
                    {filteredLeaves.map((opt) => (
                      <button
                        key={opt.id}
                        className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-3 py-2 text-left hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        onClick={() => handleLeafPick(opt.node)}
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                          {opt.title}
                        </div>
                        {opt.trail ? (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {opt.trail}
                          </div>
                        ) : null}
                      </button>
                    ))}
                    {filteredLeaves.length === 0 ? (
                      <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                        {t('ui.noItems', { defaultValue: 'No items' })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                {selected.name}
              </div>
              {leafOptions.length > 0 ? (
                <button
                  type="button"
                  className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-300"
                  onClick={() => {
                    setSelected(null);
                    onSelectLeaf?.(null);
                  }}
                >
                  {t('ui.chooseDifferentItem', { defaultValue: 'Choose a different item' })}
                </button>
              ) : null}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {t('ui.count', { defaultValue: 'Count' })}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCount((c) => Math.max(1, c - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white text-lg font-semibold text-gray-900 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:bg-gray-100 active:translate-y-[1px] dark:border-white/20 dark:bg-[rgb(var(--surface))] dark:text-gray-100 dark:hover:bg-white/10 dark:focus-visible:ring-offset-gray-900"
                    aria-label={t('ui.decreaseCount', { defaultValue: 'Decrease count' }) as string}
                  >
                    −
                  </button>
                  <div className="min-w-[3rem] text-center text-lg font-semibold text-gray-900 dark:text-gray-50">
                    {count}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCount((c) => c + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-[rgb(var(--primary))] text-lg font-semibold text-[rgb(var(--primary-ink))] shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-white hover:bg-[rgb(var(--primary))]/90 active:translate-y-[1px] dark:focus-visible:ring-offset-gray-900"
                    aria-label={t('ui.increaseCount', { defaultValue: 'Increase count' }) as string}
                  >
                    +
                  </button>
                </div>
              </div>
              <TextField
                placeholder={t('ui.optionalNote', { defaultValue: 'Optional note' }) as string}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-sm"
              />
              <div className="rounded-lg border border-gray-200 dark:border-[rgb(var(--border))] bg-gray-50 dark:bg-gray-800/50 p-2.5 mt-2">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <svg
                        className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {t('reflections.alsoLogReflection', {
                          defaultValue: 'Also log reflection',
                        })}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 ml-5 leading-tight">
                      {alsoLogReflection
                        ? t('reflections.reflectionEnabledDesc', {
                            defaultValue: 'Reflection form will appear after logging',
                          })
                        : t('reflections.reflectionDisabledDesc', {
                            defaultValue: 'Enable to add reflection',
                          })}
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={alsoLogReflection}
                    aria-label={
                      alsoLogReflection
                        ? (t('reflections.reflectionEnabled', {
                            defaultValue: 'Reflection enabled',
                          }) as string)
                        : (t('reflections.reflectionDisabled', {
                            defaultValue: 'Reflection disabled',
                          }) as string)
                    }
                    onClick={() => setAlsoLogReflection(!alsoLogReflection)}
                    disabled={submitting}
                    className={`
                      relative inline-flex h-6 w-[44px] flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out
                      focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1
                      ${
                        alsoLogReflection
                          ? 'bg-[rgb(var(--primary))]'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }
                      ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <span
                      className={`
                        pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-sm
                        transition-all duration-300 ease-in-out
                        ${alsoLogReflection ? 'translate-x-[18px]' : 'translate-x-[2px]'}
                      `}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {showReflectionForm && template && createdTaskId ? (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-[rgb(var(--border))] max-h-[60vh] overflow-y-auto">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                {t('reflections.writeReflection', { defaultValue: 'Write Reflection' })}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {t('reflections.reflectionNote', {
                  defaultValue: 'Reflect on this activity to track your learning.',
                })}
              </p>
            </div>
            <ReflectionForm
              audience="resident"
              template={template}
              initialAnswers={null}
              disabled={submittingReflection}
              onSubmit={handleReflectionSubmit}
            />
          </div>
        ) : (
          <div className="mt-4 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={onClose}
              size="sm"
              disabled={submitting || submittingReflection}
            >
              {t('ui.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleSubmit}
              size="sm"
              disabled={!selected || submittingReflection}
              loading={submitting}
            >
              {t('ui.logPlusOne', { defaultValue: 'Log +1' })}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
