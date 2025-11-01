'use client';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { RotationNode } from '../../types/rotations';
import Button from '../ui/Button';
import TextField from '../ui/TextField';

type QuickLogDialogProps = {
  open: boolean;
  onClose: () => void;
  leaf: RotationNode | null;
  onLog: (leaf: RotationNode, count: number, note?: string) => Promise<void> | void;
  recentLeaves?: Array<{ id: string; name: string; node: RotationNode }>;
};

export default function QuickLogDialog({
  open,
  onClose,
  leaf,
  onLog,
  recentLeaves = [],
}: QuickLogDialogProps) {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const [count, setCount] = useState(1);
  const [note, setNote] = useState('');
  const [selected, setSelected] = useState<RotationNode | null>(leaf);

  useEffect(() => setSelected(leaf), [leaf]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

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
              <div className="grid grid-cols-1 gap-2 max-h-48 overflow-auto">
                {recentLeaves.map((r) => (
                  <button
                    key={r.id}
                    className="card-levitate text-left"
                    onClick={() => setSelected(r.node)}
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                      {r.name}
                    </div>
                  </button>
                ))}
                {recentLeaves.length === 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t('ui.noItems', { defaultValue: 'No items' })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-50 truncate">
                {selected.name}
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 dark:text-gray-300" htmlFor="ql-count">
                  {t('ui.count', { defaultValue: 'Count' })}
                </label>
                <TextField
                  id="ql-count"
                  type="number"
                  min={1}
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Number(e.target.value)))}
                  className="w-20 text-sm"
                />
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
          <Button
            onClick={() => selected && onLog(selected, count, note)}
            size="sm"
            disabled={!selected}
          >
            {t('ui.logPlusOne', { defaultValue: 'Log +1' })}
          </Button>
        </div>
      </div>
    </div>
  );
}
