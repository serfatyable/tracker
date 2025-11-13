'use client';
import { getAuth } from 'firebase/auth';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState, useId } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { createTask, getFirstTutorIdForResident } from '../../lib/firebase/db';
import { submitReflection } from '../../lib/hooks/useReflections';
import { useLatestPublishedTemplate } from '../../lib/hooks/useReflectionTemplates';
import { logError } from '../../lib/utils/logger';
import type { RotationNode } from '../../types/rotations';
import ReflectionForm from '../reflections/ReflectionForm';
import Button from '../ui/Button';
import TextAreaField from '../ui/TextAreaField';
import TextField from '../ui/TextField';

const QUICK_SET_COUNTS = [1, 2, 3, 5, 10] as const;
const QUICK_ADD_COUNTS = [1, 2, 5] as const;
const NOTE_MAX_LENGTH = 500;
const COUNT_MIN = 1;

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
  const countInputRef = useRef<HTMLInputElement | null>(null);
  const titleize = useCallback(
    (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value),
    [],
  );
  const titleId = useId();
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<RotationNode | null>(leaf);
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [alsoLogReflection, setAlsoLogReflection] = useState(false);
  const [showReflectionForm, setShowReflectionForm] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);
  const [submittingReflection, setSubmittingReflection] = useState(false);
  const [stayOpen, setStayOpen] = useState(false);
  const selectedId = selected?.id ?? null;

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
      setStayOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !selected) return;
    countInputRef.current?.focus();
  }, [open, selected]);

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

  const optionLookup = useMemo(() => {
    const map = new Map<string, { title: string; trail?: string }>();
    leafOptions.forEach((opt) => {
      map.set(opt.node.id, { title: opt.title, trail: opt.trail });
    });
    recentLeaves.forEach((opt) => {
      if (!map.has(opt.node.id)) {
        map.set(opt.node.id, { title: opt.title, trail: opt.trail });
      }
    });
    return map;
  }, [leafOptions, recentLeaves]);

  const selectedMeta = selected ? (optionLookup.get(selected.id) ?? null) : null;

  const handleLeafPick = (node: RotationNode) => {
    setSelected(node);
    onSelectLeaf?.(node);
  };

  useEffect(() => {
    if (!selectedId) return;
    setCount(1);
    setNote('');
  }, [selectedId]);

  const updateCount = useCallback((updater: (prev: number) => number) => {
    setCount((prev) => {
      const next = updater(prev);
      if (!Number.isFinite(next)) return COUNT_MIN;
      const rounded = Math.round(next);
      return rounded >= COUNT_MIN ? rounded : COUNT_MIN;
    });
  }, []);

  const handleCountInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const raw = Number(event.target.value);
      updateCount(() => (Number.isNaN(raw) ? COUNT_MIN : raw));
    },
    [updateCount],
  );

  const handleQuickSet = useCallback(
    (value: number) => {
      updateCount(() => value);
      countInputRef.current?.focus();
    },
    [updateCount],
  );

  const handleQuickAdd = useCallback(
    (value: number) => {
      updateCount((prev) => prev + value);
      countInputRef.current?.focus();
    },
    [updateCount],
  );

  const handleCountKey = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        updateCount((prev) => prev + 1);
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        updateCount((prev) => prev - 1);
      }
    },
    [updateCount],
  );

  const handleSubmit = useCallback(async () => {
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
        if (stayOpen) {
          setTimeout(() => {
            countInputRef.current?.focus();
          }, 50);
        } else {
          onClose();
        }
      }
    } catch (error) {
      console.error('Failed to log activity from quick dialog', error);
      logError('Failed to log activity from quick dialog', 'QuickLogDialog', error as Error);
    } finally {
      setSubmitting(false);
    }
  }, [alsoLogReflection, count, note, onClose, onLog, selected, stayOpen, submitting]);

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

  const handleDialogKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (showReflectionForm) return;
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit, showReflectionForm],
  );

  const logButtonLabel =
    count === 1
      ? t('ui.logPlusOne', { defaultValue: 'Log +1' })
      : `${titleize(t('ui.log', { defaultValue: 'Log' }))} +${count}`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] p-4 flex items-end sm:items-center justify-center bg-black/30">
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-xl border bg-white dark:bg-[rgb(var(--surface))] border-gray-200 dark:border-[rgb(var(--border))] shadow-xl p-4 sm:p-5"
        onKeyDown={handleDialogKeyDown}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="flex items-center justify-between mb-2">
          <h2 id={titleId} className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {showReflectionForm
              ? t('reflections.writeReflection', { defaultValue: 'Write Reflection' })
              : t('ui.logActivity', { defaultValue: 'Log activity' })}
          </h2>
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
                          className="w-full rounded-lg border border-gray-200/70 dark:border-white/10 bg-gradient-to-r from-white to-blue-50/60 dark:from-white/5 dark:to-white/0 px-3 py-2 text-left hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                        className="w-full rounded-lg border border-gray-200/70 dark:border-white/10 bg-white/90 dark:bg-white/5 px-3 py-2 text-left hover:border-blue-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
            <div className="space-y-3">
              <div className="rounded-lg border border-gray-200/80 dark:border-[rgb(var(--border))] bg-white/80 dark:bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-50 truncate">
                      {selected.name}
                    </div>
                    {selectedMeta?.trail ? (
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 truncate">
                        {selectedMeta.trail}
                      </div>
                    ) : null}
                  </div>
                  {selected.requiredCount ? (
                    <div className="rounded-md bg-[rgb(var(--primary))]/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[rgb(var(--primary))] dark:text-[rgb(var(--primary-ink))]">
                      {titleize(t('ui.goal', { defaultValue: 'Goal' }))}: {selected.requiredCount}
                    </div>
                  ) : null}
                </div>
                {leafOptions.length > 0 ? (
                  <button
                    type="button"
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-300"
                    onClick={() => {
                      setSelected(null);
                      onSelectLeaf?.(null);
                    }}
                  >
                    {t('ui.chooseDifferentItem', { defaultValue: 'Choose a different item' })}
                  </button>
                ) : null}
              </div>

              <div className="rounded-xl border border-gray-200/80 dark:border-[rgb(var(--border))] bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-white/5 dark:via-white/5 dark:to-white/10 p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-900/80 dark:text-blue-200">
                    {t('ui.count', { defaultValue: 'Count' })}
                  </span>
                  <span className="hidden text-[10px] text-blue-900/70 dark:text-blue-200/80 sm:inline">
                    Ctrl+Enter
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(-1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-white text-lg font-semibold text-blue-600 shadow-sm transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-blue-300/40 dark:bg-[rgb(var(--surface))] dark:text-blue-200"
                    aria-label={t('ui.decreaseCount', { defaultValue: 'Decrease count' }) as string}
                  >
                    −
                  </button>
                  <input
                    ref={countInputRef}
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min={COUNT_MIN}
                    value={count}
                    onChange={handleCountInputChange}
                    onKeyDown={handleCountKey}
                    className="w-20 rounded-md border border-blue-200 bg-white px-3 py-2 text-center text-lg font-semibold text-blue-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-blue-200/40 dark:bg-[rgb(var(--surface))] dark:text-blue-100"
                    aria-live="polite"
                  />
                  <button
                    type="button"
                    onClick={() => handleQuickAdd(1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-transparent bg-[rgb(var(--primary))] text-lg font-semibold text-[rgb(var(--primary-ink))] shadow-sm transition hover:bg-[rgb(var(--primary))]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--primary))] focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                    aria-label={t('ui.increaseCount', { defaultValue: 'Increase count' }) as string}
                  >
                    +
                  </button>
                </div>
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wide text-blue-900/70 dark:text-blue-200/80">
                    {titleize(t('ui.quickSet', { defaultValue: 'Quick set' }))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_SET_COUNTS.map((value) => (
                      <button
                        key={`quick-set-${value}`}
                        type="button"
                        onClick={() => handleQuickSet(value)}
                        className={`rounded-full px-3 py-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
                          count === value
                            ? 'bg-[rgb(var(--primary))] text-[rgb(var(--primary-ink))] shadow'
                            : 'bg-white/90 text-blue-900/80 border border-blue-200 hover:bg-blue-50 dark:bg-white/10 dark:text-blue-100 dark:border-blue-200/40'
                        }`}
                        aria-pressed={count === value}
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-3 border-t border-blue-100 pt-3 dark:border-blue-200/30">
                  <div className="text-[11px] uppercase tracking-wide text-blue-900/70 dark:text-blue-200/80">
                    {titleize(t('ui.quickAdd', { defaultValue: 'Quick add' }))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {QUICK_ADD_COUNTS.map((value) => (
                      <button
                        key={`quick-add-${value}`}
                        type="button"
                        onClick={() => handleQuickAdd(value)}
                        className="rounded-full border border-blue-200/70 bg-white/80 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-blue-200/30 dark:bg-white/10 dark:text-blue-100 dark:hover:bg-white/20"
                      >
                        +{value}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <TextAreaField
                placeholder={t('ui.optionalNote', { defaultValue: 'Optional note' }) as string}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={NOTE_MAX_LENGTH}
                rows={3}
                className="text-sm"
                helpText={`${note.length}/${NOTE_MAX_LENGTH} characters`}
              />

              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200/80 dark:border-[rgb(var(--border))] bg-white/90 dark:bg-white/5 p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <svg
                          className="h-3.5 w-3.5 text-blue-600 dark:text-blue-200 flex-shrink-0"
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
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {t('reflections.alsoLogReflection', {
                            defaultValue: 'Also log reflection',
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">
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
                      onClick={() => setAlsoLogReflection((prev) => !prev)}
                      disabled={submitting}
                      className={`
                        relative inline-flex h-6 w-[44px] flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-900
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
                          pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out
                          ${alsoLogReflection ? 'translate-x-[18px]' : 'translate-x-[2px]'}
                        `}
                      />
                    </button>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200/80 dark:border-[rgb(var(--border))] bg-white/90 dark:bg-white/5 p-2.5 shadow-sm">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <svg
                          className="h-3.5 w-3.5 text-purple-500 dark:text-purple-200 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9H4m8 11a8 8 0 100-16 8 8 0 000 16zm0-8h.01"
                          />
                        </svg>
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {titleize(t('ui.keepDialogOpen', { defaultValue: 'Keep dialog open' }))}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">
                        {stayOpen
                          ? t('ui.keepDialogOpenEnabled', {
                              defaultValue: 'Log will submit but stay on this screen',
                            })
                          : t('ui.keepDialogOpenDisabled', {
                              defaultValue: 'Enable when logging several entries',
                            })}
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={stayOpen}
                      aria-label={
                        stayOpen
                          ? (t('ui.keepDialogOpenEnabled', {
                              defaultValue: 'Keep dialog open enabled',
                            }) as string)
                          : (t('ui.keepDialogOpenDisabled', {
                              defaultValue: 'Keep dialog open disabled',
                            }) as string)
                      }
                      onClick={() => setStayOpen((prev) => !prev)}
                      disabled={submitting}
                      className={`
                        relative inline-flex h-6 w-[44px] flex-shrink-0 cursor-pointer rounded-full transition-colors duration-300 ease-in-out
                        focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-1 focus:ring-offset-white dark:focus:ring-offset-gray-900
                        ${stayOpen ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}
                        ${submitting ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <span
                        className={`
                          pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out
                          ${stayOpen ? 'translate-x-[18px]' : 'translate-x-[2px]'}
                        `}
                      />
                    </button>
                  </div>
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
              {logButtonLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
