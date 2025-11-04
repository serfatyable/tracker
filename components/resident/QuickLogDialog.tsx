'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RotationNode } from '../../types/rotations';
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

  useEffect(() => setSelected(leaf), [leaf]);

  useEffect(() => {
    if (!open) return;
    setCount(1);
    setNote('');
    setSearch('');
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
      await onLog(selected, count, trimmedNote ? trimmedNote : undefined);
      setCount(1);
      setNote('');
    } catch (error) {
      console.error('Failed to log activity from quick dialog', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] p-4 flex items-end sm:items-center justify-center bg-black/30">
      <div
        ref={dialogRef}
        className="w-full max-w-md rounded-lg border bg-white dark:bg-[rgb(var(--surface))] border-gray-200 dark:border-[rgb(var(--border))] shadow-lg p-4"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-50">
            {t('ui.logActivity', { defaultValue: 'Log activity' })}
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded hover:bg-black/5 dark:hover:bg-white/5"
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
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} size="sm">
            {t('ui.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button onClick={handleSubmit} size="sm" disabled={!selected} loading={submitting}>
            {t('ui.logPlusOne', { defaultValue: 'Log +1' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
