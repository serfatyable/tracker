'use client';
import { useTranslation } from 'react-i18next';

import { formatDateTimeLocale } from '@/lib/utils/dateUtils';
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
      className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border-gray-200 dark:border-[rgb(var(--border))] bg-white dark:bg-gray-800"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Task Type as Title */}
          <div className="font-semibold text-base mb-1 text-gray-900 dark:text-white truncate">
            {reflection.taskType ||
              t('reflections.untitledReflection', { defaultValue: 'Untitled Reflection' })}
          </div>

          {/* Author Role Badge */}
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                reflection.authorRole === 'resident'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              }`}
            >
              {reflection.authorRole === 'resident'
                ? t('ui.resident', { defaultValue: 'Resident' })
                : t('ui.tutor', { defaultValue: 'Tutor' })}
            </span>
          </div>

          {/* Task ID (small, secondary) */}
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mb-1">
            {t('reflections.taskId', { defaultValue: 'Task ID' })}: {taskId}
          </div>
        </div>

        {/* Date */}
        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{dateStr}</div>
      </div>
    </div>
  );

  return cardContent;
}
