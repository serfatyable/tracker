'use client';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';

export type PreviewRow = {
  rowNumber: number;
  date: Date;
  dayOfWeek?: string;
  shifts: Record<string, string>;
};

export type ValidationError = {
  row: number;
  message: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rows: PreviewRow[];
  errors: ValidationError[];
  isLoading: boolean;
};

function getMonthColor(month: number): string {
  const colors = [
    'bg-blue-50 dark:bg-blue-950/30',
    'bg-green-50 dark:bg-green-950/30',
    'bg-purple-50 dark:bg-purple-950/30',
    'bg-orange-50 dark:bg-orange-950/30',
    'bg-pink-50 dark:bg-pink-950/30',
    'bg-teal-50 dark:bg-teal-950/30',
    'bg-indigo-50 dark:bg-indigo-950/30',
    'bg-yellow-50 dark:bg-yellow-950/30',
    'bg-red-50 dark:bg-red-950/30',
    'bg-cyan-50 dark:bg-cyan-950/30',
    'bg-lime-50 dark:bg-lime-950/30',
    'bg-amber-50 dark:bg-amber-950/30',
  ];
  return colors[month] || colors[0]!;
}

function getMonthBorder(month: number): string {
  const borders = [
    'border-l-4 border-blue-400',
    'border-l-4 border-green-400',
    'border-l-4 border-purple-400',
    'border-l-4 border-orange-400',
    'border-l-4 border-pink-400',
    'border-l-4 border-teal-400',
    'border-l-4 border-indigo-400',
    'border-l-4 border-yellow-400',
    'border-l-4 border-red-400',
    'border-l-4 border-cyan-400',
    'border-l-4 border-lime-400',
    'border-l-4 border-amber-400',
  ];
  return borders[month] || borders[0]!;
}

function formatMonthYear(date: Date, language: string): string {
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export default function ImportPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  rows,
  errors,
  isLoading,
}: Props) {
  const { t, i18n } = useTranslation();

  // Group rows by month
  const rowsByMonth = useMemo(() => {
    const groups = new Map<string, typeof rows>();
    rows.forEach((row) => {
      if (row.date instanceof Date) {
        const key = formatMonthYear(row.date, i18n.language);
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(row);
      }
    });
    return groups;
  }, [rows, i18n.language]);

  // Count total shifts
  const totalShifts = useMemo(() => {
    return rows.reduce((sum, row) => sum + Object.keys(row.shifts).length, 0);
  }, [rows]);

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader>
        {t('onCall.import.previewTitle', { defaultValue: 'Preview On-Call Schedule' })}
      </DialogHeader>

      <div className="space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Month count info */}
        {rowsByMonth.size > 1 && (
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                📅{' '}
                {t('onCall.import.multipleMonths', {
                  count: rowsByMonth.size,
                  defaultValue: `Importing ${rowsByMonth.size} months`,
                })}
              </span>
            </div>
            <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
              {Array.from(rowsByMonth.keys()).join(', ')}
            </div>
          </div>
        )}

        {/* Error summary */}
        {errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded p-3">
            <div className="font-medium text-red-800 dark:text-red-200">
              {t('onCall.import.errors', {
                count: errors.length,
                defaultValue: `${errors.length} errors found`,
              })}
            </div>
            <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1 max-h-40 overflow-y-auto">
              {errors.map((err, idx) => (
                <li key={idx}>
                  Row {err.row}: {err.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Compact day-by-day list */}
        <div className="space-y-1">
          {rows.map((row) => {
            const monthColor = getMonthColor(row.date.getMonth());
            const monthBorder = getMonthBorder(row.date.getMonth());

            return (
              <div
                key={row.rowNumber}
                className={`${monthColor} ${monthBorder} p-3 rounded hover:opacity-90 transition-opacity`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">{row.date.getDate()}</span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {row.date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                        weekday: 'short',
                        month: 'short',
                      })}
                    </span>
                  </div>
                  <span className="text-xs bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                    {Object.keys(row.shifts).length} shifts
                  </span>
                </div>

                {/* Show shift assignments (collapsed view) */}
                <div className="text-xs text-gray-700 dark:text-[rgb(var(--fg))] space-y-1">
                  {Object.entries(row.shifts)
                    .slice(0, 3)
                    .map(([shiftType, resident]) => (
                      <div key={shiftType} className="flex gap-2">
                        <span className="font-medium">{shiftType}:</span>
                        <span>{resident}</span>
                      </div>
                    ))}
                  {Object.keys(row.shifts).length > 3 && (
                    <div className="text-gray-500 dark:text-gray-400">
                      +{Object.keys(row.shifts).length - 3} more...
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="text-sm text-gray-600 dark:text-gray-400 border-t pt-3">
          <div>
            {t('onCall.import.totalDays', {
              count: rows.length,
              defaultValue: `Total: ${rows.length} days`,
            })}
          </div>
          <div>
            {t('onCall.import.totalShifts', {
              count: totalShifts,
              defaultValue: `Total shifts: ${totalShifts}`,
            })}
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose} disabled={isLoading}>
          {t('ui.cancel')}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={errors.length > 0 || isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          {isLoading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              {t('ui.importing')}
            </span>
          ) : (
            t('onCall.import.confirmImport', { defaultValue: 'Confirm Import' })
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
