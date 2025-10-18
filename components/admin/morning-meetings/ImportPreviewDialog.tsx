'use client';
import { useTranslation } from 'react-i18next';
import Button from '../../ui/Button';

export type PreviewRow = {
  rowNumber: number;
  dayOfWeek: string;
  date: string;
  title: string;
  lecturer: string;
  moderator: string;
  organizer: string;
  link?: string;
  notes?: string;
};

export type ValidationError = {
  row: number;
  message: string;
};

type ImportPreviewDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  rows: PreviewRow[];
  errors: ValidationError[];
  isLoading?: boolean;
};

// Helper function to format dates
function formatDate(dateStr: string): string {
  // If it looks like DD/MM/YYYY already, return as-is
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  
  // If it's a number (Excel serial), convert it
  const num = parseFloat(dateStr);
  if (!isNaN(num) && num > 40000) {
    // Excel serial number (days since 1900-01-01 with leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + num * 86400000);
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }
  
  // Return as-is if we can't parse it
  return dateStr;
}

// Helper to parse date string to Date object
function parseDate(dateStr: string): Date | null {
  // If it looks like DD/MM/YYYY, parse it
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('/');
    const day = parseInt(parts[0]!, 10);
    const month = parseInt(parts[1]!, 10) - 1;
    const year = parseInt(parts[2]!, 10);
    return new Date(year, month, day);
  }
  
  // If it's a number (Excel serial), convert it
  const num = parseFloat(dateStr);
  if (!isNaN(num) && num > 40000) {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    return new Date(excelEpoch.getTime() + num * 86400000);
  }
  
  return null;
}

// Helper to get month/year key from date
function getMonthKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

// Helper to format month/year for display
function formatMonthYear(date: Date, language: string): string {
  return date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
    month: 'long',
    year: 'numeric'
  });
}

// Helper to get color for a specific month (guaranteed unique per month)
function getMonthColor(date: Date): string {
  const month = date.getMonth(); // 0-11
  
  const colors = [
    'bg-blue-50 dark:bg-blue-950/30',      // January (0)
    'bg-green-50 dark:bg-green-950/30',    // February (1)
    'bg-purple-50 dark:bg-purple-950/30',  // March (2)
    'bg-orange-50 dark:bg-orange-950/30',  // April (3)
    'bg-pink-50 dark:bg-pink-950/30',      // May (4)
    'bg-teal-50 dark:bg-teal-950/30',      // June (5)
    'bg-indigo-50 dark:bg-indigo-950/30',  // July (6)
    'bg-yellow-50 dark:bg-yellow-950/30',  // August (7)
    'bg-red-50 dark:bg-red-950/30',        // September (8)
    'bg-cyan-50 dark:bg-cyan-950/30',      // October (9)
    'bg-lime-50 dark:bg-lime-950/30',      // November (10)
    'bg-amber-50 dark:bg-amber-950/30',    // December (11)
  ];
  
  return colors[month]!;
}

// Helper to get border color for a specific month (guaranteed unique per month)
function getMonthBorder(date: Date): string {
  const month = date.getMonth(); // 0-11
  
  const borders = [
    'border-l-4 border-blue-400',      // January
    'border-l-4 border-green-400',     // February
    'border-l-4 border-purple-400',    // March
    'border-l-4 border-orange-400',    // April
    'border-l-4 border-pink-400',      // May
    'border-l-4 border-teal-400',      // June
    'border-l-4 border-indigo-400',    // July
    'border-l-4 border-yellow-400',    // August
    'border-l-4 border-red-400',       // September
    'border-l-4 border-cyan-400',      // October
    'border-l-4 border-lime-400',      // November
    'border-l-4 border-amber-400',     // December
  ];
  
  return borders[month]!;
}

export default function ImportPreviewDialog({
  isOpen,
  onClose,
  onConfirm,
  rows,
  errors,
  isLoading = false,
}: ImportPreviewDialogProps) {
  const { t, i18n } = useTranslation();
  const hasErrors = errors.length > 0;

  // Group rows by month
  const rowsByMonth = new Map<string, { monthKey: string; monthLabel: string; rows: PreviewRow[] }>();
  rows.forEach((row) => {
    const date = parseDate(row.date);
    if (date) {
      const monthKey = getMonthKey(date);
      if (!rowsByMonth.has(monthKey)) {
        rowsByMonth.set(monthKey, {
          monthKey,
          monthLabel: formatMonthYear(date, i18n.language),
          rows: [],
        });
      }
      rowsByMonth.get(monthKey)!.rows.push(row);
    }
  });

  const monthCount = rowsByMonth.size;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        role="presentation"
        aria-label="Close dialog"
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-full max-w-6xl rounded-lg bg-white dark:bg-[rgb(var(--surface))] text-gray-900 dark:text-[rgb(var(--fg))] p-4 sm:p-6 shadow-2xl border border-gray-200 dark:border-[rgb(var(--border-strong))] focus:outline-none max-h-[90vh] overflow-y-auto"
        tabIndex={-1}
      >
        {/* Dialog Header */}
        <div className="mb-4 text-lg font-semibold">{t('morningMeetings.import.previewTitle')}</div>

        <div className="space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-[rgb(var(--surface-elevated))] rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                {t('morningMeetings.import.totalRows')}: {rows.length}
              </p>
              {hasErrors && (
                <p className="text-sm font-medium text-red-600 dark:text-red-400">
                  {t('morningMeetings.import.errorCount')}: {errors.length}
                </p>
              )}
            </div>
            {!hasErrors && rows.length > 0 && (
              <div className="text-xs text-green-600 dark:text-green-400 font-medium bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full">
                ✅ Ready to import
              </div>
            )}
          </div>

          {/* Multi-month badge */}
          {monthCount > 1 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-600 dark:text-blue-400 font-medium text-sm">
                  📅 {t('morningMeetings.import.multipleMonths', { count: monthCount, defaultValue: `Importing ${monthCount} months` })}
                </span>
              </div>
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                {Array.from(rowsByMonth.values()).map(m => m.monthLabel).join(' • ')}
              </div>
            </div>
          )}

          {/* Errors Section */}
          {hasErrors && (
            <div className="rounded-lg border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/30 p-4 max-h-40 overflow-y-auto">
              <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                {t('morningMeetings.import.validationErrors')}
              </h3>
              <ul className="space-y-1">
                {errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700 dark:text-red-400">
                    {error.row > 0 ? `${t('morningMeetings.import.row')} ${error.row}: ` : ''}
                    {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Preview Table */}
          {rows.length > 0 && (
            <div className="border border-gray-200 dark:border-[rgb(var(--border))] rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-[rgb(var(--border))]">
                  <thead className="bg-gray-50 dark:bg-[rgb(var(--surface-elevated))] sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        #
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('morningMeetings.import.day')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('morningMeetings.import.date')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('morningMeetings.import.title')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('morningMeetings.import.lecturer')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('morningMeetings.import.moderator')}
                      </th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                        {t('morningMeetings.import.organizer')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-[rgb(var(--surface))] divide-y divide-gray-200 dark:divide-[rgb(var(--border))]">
                    {rows.map((row) => {
                      const date = parseDate(row.date);
                      const monthColor = date ? getMonthColor(date) : '';
                      const monthBorder = date ? getMonthBorder(date) : '';
                      
                      return (
                        <tr 
                          key={row.rowNumber} 
                          className={`${monthColor} ${monthBorder} hover:opacity-80 transition-opacity`}
                        >
                          <td className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400 text-right">
                            {row.rowNumber}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-right font-medium">
                            {row.dayOfWeek}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-right whitespace-nowrap" dir="ltr">
                            {formatDate(row.date)}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900 dark:text-gray-100 text-right max-w-xs truncate">
                            {row.title}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {row.lecturer || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {row.moderator || '-'}
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400 text-right">
                            {row.organizer || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Warning if errors exist */}
          {hasErrors && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                {t('morningMeetings.import.cannotImportWithErrors')}
              </p>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="mt-6 flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-[rgb(var(--border))]">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            disabled={isLoading}
            className="border border-gray-300"
          >
            {t('ui.cancel')}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={hasErrors || isLoading || rows.length === 0}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                {t('ui.importing')}
              </span>
            ) : (
              t('morningMeetings.import.confirmImport')
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
