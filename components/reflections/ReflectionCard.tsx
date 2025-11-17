'use client';
import { useTranslation } from 'react-i18next';

import { formatDateTimeLocale } from '@/lib/utils/dateUtils';
import { sanitizeContentStrict } from '@/lib/utils/sanitize';
import type { ReflectionListItem } from '@/types/reflections';

type Props = {
  reflection: ReflectionListItem;
  showResidentInfo?: boolean;
  showTutorInfo?: boolean;
  onClick?: () => void;
};

export default function ReflectionCard({
  reflection,
  showResidentInfo: _showResidentInfo = false,
  showTutorInfo: _showTutorInfo = false,
  onClick,
}: Props) {
  const { t, i18n } = useTranslation();

  // Extract task ID from taskOccurrenceId (format: taskId or could be more complex)
  const taskId = reflection.taskOccurrenceId;

  // Format date
  const dateStr = reflection.submittedAt?.toDate
    ? formatDateTimeLocale(reflection.submittedAt.toDate(), i18n.language)
    : '';

  const cardContent = (
    <div
      className="group border rounded-lg p-4 hover:shadow-lg hover:border-primary/50 transition-all duration-200 cursor-pointer border-gray-200 dark:border-[rgb(var(--border))] bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/80"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Task Type as Title */}
          <div className="font-semibold text-base mb-2 text-gray-900 dark:text-white truncate group-hover:text-primary transition-colors">
            {reflection.taskType
              ? sanitizeContentStrict(reflection.taskType)
              : t('reflections.untitledReflection', { defaultValue: 'Untitled Reflection' })}
          </div>

          {/* Author Role Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                reflection.authorRole === 'resident'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200'
              }`}
            >
              {reflection.authorRole === 'resident'
                ? t('ui.resident', { defaultValue: 'Resident' })
                : t('ui.tutor', { defaultValue: 'Tutor' })}
            </span>
          </div>

          {/* Task ID (small, secondary) */}
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {t('reflections.taskId', { defaultValue: 'Task ID' })}: {taskId}
          </div>
        </div>

        {/* Date and arrow */}
        <div className="flex flex-col items-end gap-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
            {dateStr}
          </div>
          <svg
            className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );

  return cardContent;
}
