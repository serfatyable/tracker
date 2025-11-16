'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import type { RotationMeta, Status } from '../../lib/hooks/useRotationsIndex';
import { createSynonymMatcher } from '../../lib/search/synonyms';

// Custom dialog implementation for mobile sheet

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
    const matcher = createSynonymMatcher(searchTerm);
    const mine = index.mine.filter((r) => matcher(r.name));
    const all = index.all.filter((r) => matcher(r.name));
    return { mine, allFiltered: all };
  }, [index.mine, index.all, searchTerm]);

  // Lock body scroll when sheet is open and manage focus
  useEffect(() => {
    if (!open) return;

    // Store the currently focused element to restore later
    const previouslyFocused = document.activeElement as HTMLElement;

    // Lock body scroll (but allow sheet content to scroll)
    const prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the sheet container for keyboard navigation
    const sheetContainer = document.querySelector('[role="dialog"]') as HTMLElement;
    if (sheetContainer) {
      sheetContainer.focus();
    }

    return () => {
      // Restore body scroll
      document.body.style.overflow = prevBodyOverflow;

      // Restore focus to previously focused element
      if (previouslyFocused && previouslyFocused.focus) {
        previouslyFocused.focus();
      }
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

  // Handle Escape key to close dialog
  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" onClick={onClose} aria-hidden="true" />

      {/* Sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-md rounded-t-2xl bg-white shadow-xl ring-1 ring-black/5 dark:bg-gray-900 dark:ring-white/10 sheet-max-h flex flex-col overflow-hidden pointer-events-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="rotation-picker-title"
        tabIndex={-1}
      >
        {/* Row 1: Header */}
        <div className="px-4 pt-3 pb-2">
          <div
            id="rotation-picker-title"
            className="text-base font-semibold text-gray-900 dark:text-gray-100"
          >
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
          className="flex-1 min-h-0 scroll-y-touch overflow-y-auto overscroll-contain pb-safe px-2"
          role="region"
          aria-label={t('ui.selectRotation', { defaultValue: 'Select rotation' })}
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
