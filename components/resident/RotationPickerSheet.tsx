'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Custom dialog implementation for mobile sheet
import type { RotationMeta, Status } from '../../lib/hooks/useRotationsIndex';

type Props = {
  open: boolean;
  onClose: () => void;
  activeId: string | null;
  onSelect: (id: string | null) => void;
  index: {
    all: RotationMeta[];
    mine: RotationMeta[];
    statusById: Record<string, Status>;
  };
};

export default function RotationPickerSheet({ open, onClose, activeId, onSelect, index }: Props) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const { mine, allFiltered } = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    const mine = index.mine.filter((r) => r.name.toLowerCase().includes(term));
    const all = index.all.filter((r) => r.name.toLowerCase().includes(term));
    return { mine, allFiltered: all };
  }, [index.mine, index.all, searchTerm]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (!open) return;

    // Temporarily disabled to test if sheet can scroll at all
    // const prevBodyOverflow = document.body.style.overflow;
    // const prevHtmlOverflow = document.documentElement.style.overflow;
    // document.body.style.overflow = 'hidden';
    // document.documentElement.style.overflow = 'hidden';

    return () => {
      // document.body.style.overflow = prevBodyOverflow;
      // document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [open]);

  const getStatusLabel = (id: string) => {
    const status = index.statusById[id];
    switch (status) {
      case 'completed':
        return t('ui.statusCompleted', { defaultValue: 'Completed' });
      case 'in-progress':
        return t('ui.statusInProgress', { defaultValue: 'In progress' });
      case 'not-started':
        return t('ui.statusNotStarted', { defaultValue: 'Not started' });
      default:
        return t('ui.statusNotStarted', { defaultValue: 'Not started' });
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 sheet-max-h grid grid-rows-[auto,auto,1fr] pointer-events-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Row 1: Header */}
        <div className="px-4 pt-3 pb-2">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {t('ui.selectRotation', { defaultValue: 'Select rotation' })}
          </div>
        </div>

        {/* Row 2: Search input */}
        <div className="px-4 pb-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('ui.searchRotations', { defaultValue: 'Search rotations...' })}
            className="input-levitate w-full"
            aria-label={t('ui.searchRotations', { defaultValue: 'Search rotations...' })}
          />
        </div>

        {/* Row 3: Scrollable list area */}
        <div
          className="min-h-0 scroll-y-touch scrollbar-stable pb-safe px-2"
          role="region"
          aria-label={t('ui.selectRotation', { defaultValue: 'Select rotation' })}
          style={{ touchAction: 'pan-y' }}
        >
          {/* "All rotations" option */}
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={`w-full text-left px-2 py-3 rounded-lg hover:bg-muted/50 ${
              activeId === null
                ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                : 'text-gray-900 dark:text-gray-100'
            }`}
            aria-label={`${t('ui.allRotations', { defaultValue: 'All rotations' })}, ${activeId === null ? 'selected' : 'unselected'}`}
          >
            <div className="flex items-center justify-between">
              <span className="truncate font-medium">
                {t('ui.allRotations', { defaultValue: 'All rotations' })}
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                All
              </span>
            </div>
          </button>

          {/* My rotations section (if any) */}
          {mine.length > 0 && (
            <>
              <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-2 py-1 text-xs font-medium text-muted-foreground dark:bg-gray-900/90">
                {t('ui.myRotations', { defaultValue: 'My rotations' })}
              </div>
              <ul role="list" className="px-1">
                {mine.map((rotation) => (
                  <li key={rotation.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(rotation.id)}
                      className={`w-full text-left px-3 py-3 rounded-lg hover:bg-muted/50 ${
                        activeId === rotation.id
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}
                      aria-label={`${rotation.name}, ${getStatusLabel(rotation.id)}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="truncate">{rotation.name}</span>
                        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                          {getStatusLabel(rotation.id)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* All rotations section */}
          <div className="sticky top-0 z-10 bg-white/90 backdrop-blur px-2 py-1 text-xs font-medium text-muted-foreground dark:bg-gray-900/90">
            {t('ui.allRotations', { defaultValue: 'All rotations' })}
          </div>
          <ul role="list" className="px-1">
            {allFiltered.map((rotation) => (
              <li key={rotation.id}>
                <button
                  type="button"
                  onClick={() => onSelect(rotation.id)}
                  className={`w-full text-left px-3 py-3 rounded-lg hover:bg-muted/50 ${
                    activeId === rotation.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}
                  aria-label={`${rotation.name}, ${getStatusLabel(rotation.id)}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate">{rotation.name}</span>
                    <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      {getStatusLabel(rotation.id)}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {/* Add a small spacer so last item isn't hidden by the curve */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
