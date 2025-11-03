'use client';

import { ChevronDownIcon, ChevronRightIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { AssignmentWithDetails } from '../../../types/assignments';

interface AssignmentBadgesProps {
  assignments: AssignmentWithDetails[];
  maxVisible?: number;
  className?: string;
  onManageRotations?: () => void;
  manageLabel?: string;
  manageDisabled?: boolean;
}

export default function AssignmentBadges({
  assignments,
  maxVisible = 2,
  className = '',
  onManageRotations,
  manageLabel,
  manageDisabled = false,
}: AssignmentBadgesProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);

  const hasAssignments = assignments && assignments.length > 0;

  // Flatten all tutor names from all assignments
  const allTutorNames = hasAssignments
    ? assignments.flatMap((assignment) => assignment.tutorNames || [])
    : [];

  // Remove duplicates while preserving order
  const uniqueTutorNames = Array.from(new Set(allTutorNames));

  const visibleTutors = isExpanded ? uniqueTutorNames : uniqueTutorNames.slice(0, maxVisible);
  const remainingCount = Math.max(uniqueTutorNames.length - maxVisible, 0);

  const showManage = Boolean(onManageRotations);

  return (
    <div className={showManage ? 'space-y-2' : undefined}>
      {hasAssignments ? (
        <div className={`flex flex-wrap items-center gap-1 ${className}`}>
          {visibleTutors.map((tutorName, index) => (
            <span
              key={`${tutorName}-${index}`}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
            >
              {tutorName}
            </span>
          ))}

          {remainingCount > 0 && !isExpanded && (
            <button
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              +{remainingCount} more
              <ChevronDownIcon className="w-3 h-3 ml-1" />
            </button>
          )}

          {isExpanded && remainingCount > 0 && (
            <button
              onClick={() => setIsExpanded(false)}
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              Show less
              <ChevronUpIcon className="w-3 h-3 ml-1" />
            </button>
          )}
        </div>
      ) : (
        <div>
          <span className={`text-sm text-muted italic ${className}`}>
            {t('ui.noTutorsAssigned', { defaultValue: 'No tutors assigned' })}
          </span>
        </div>
      )}

      {showManage && (
        <button
          type="button"
          onClick={onManageRotations}
          disabled={manageDisabled}
          className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {manageLabel || t('admin.users.manageRotations', { defaultValue: 'Manage rotations' })}
          <ChevronRightIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
