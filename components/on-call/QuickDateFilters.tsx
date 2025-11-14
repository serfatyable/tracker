'use client';
import { useTranslation } from 'react-i18next';

import { addDays, toDateKey } from '../../lib/utils/dateUtils';

interface QuickDateFiltersProps {
  onDateSelect: (dateKey: string) => void;
  currentDate?: string;
}

export default function QuickDateFilters({ onDateSelect, currentDate }: QuickDateFiltersProps) {
  const { t } = useTranslation();

  const today = new Date();
  const todayKey = toDateKey(today);

  const filters = [
    {
      label: t('onCall.quickFilters.today', { defaultValue: 'Today' }),
      dateKey: todayKey,
    },
    {
      label: t('onCall.quickFilters.tomorrow', { defaultValue: 'Tomorrow' }),
      dateKey: toDateKey(addDays(today, 1)),
    },
    {
      label: t('onCall.quickFilters.thisWeek', { defaultValue: 'This Week' }),
      dateKey: todayKey,
      action: 'week',
    },
    {
      label: t('onCall.quickFilters.nextWeek', { defaultValue: 'Next Week' }),
      dateKey: toDateKey(addDays(today, 7)),
      action: 'week',
    },
    {
      label: t('onCall.quickFilters.thisMonth', { defaultValue: 'This Month' }),
      dateKey: todayKey,
      action: 'month',
    },
    {
      label: t('onCall.quickFilters.nextMonth', { defaultValue: 'Next Month' }),
      dateKey: toDateKey(new Date(today.getFullYear(), today.getMonth() + 1, 1)),
      action: 'month',
    },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter, idx) => (
        <button
          key={idx}
          onClick={() => onDateSelect(filter.dateKey)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
            currentDate === filter.dateKey
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
          }`}
          aria-label={filter.label}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
