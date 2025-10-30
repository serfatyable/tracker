'use client';

import { UserIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import type { AssignmentWithDetails } from '../../../types/assignments';
import Button from '../../ui/Button';

interface AssignmentCardProps {
  assignment: AssignmentWithDetails;
  onAssignTutor: (residentId: string) => void;
  onUnassignTutor: (residentId: string, tutorId: string) => void;
  loading?: boolean;
}

export default function AssignmentCard({
  assignment,
  onAssignTutor,
  onUnassignTutor,
  loading = false,
}: AssignmentCardProps) {
  const { t } = useTranslation();

  const handleUnassign = (tutorId: string) => {
    onUnassignTutor(assignment.residentId, tutorId);
  };

  return (
    <div className="card-levitate p-4 space-y-3">
      {/* Header: Resident Info */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">
            {assignment.residentName || 'Unknown Resident'}
          </div>
          <div className="text-sm text-muted">
            {assignment.isGlobal ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                {t('ui.globalAssignment', { defaultValue: 'Global Assignment' })}
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                {assignment.rotationName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tutors List */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted">
          {t('ui.assignedTutors', { defaultValue: 'Assigned Tutors' })} (
          {assignment.tutorNames?.length || 0})
        </div>

        {assignment.tutorNames && assignment.tutorNames.length > 0 ? (
          <div className="space-y-1">
            {assignment.tutorNames.map((tutorName, index) => {
              const tutorId = assignment.tutorIds[index];
              if (!tutorId) return null;
              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-md px-3 py-2"
                >
                  <span className="text-sm truncate flex-1">{tutorName}</span>
                  <button
                    onClick={() => handleUnassign(tutorId)}
                    disabled={loading}
                    className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                    title={t('ui.unassign', { defaultValue: 'Unassign' })}
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-muted italic py-2">
            {t('ui.noTutorsAssigned', { defaultValue: 'No tutors assigned' })}
          </div>
        )}
      </div>

      {/* Add Tutor Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onAssignTutor(assignment.residentId)}
        disabled={loading}
        className="w-full btn-levitate border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        {t('ui.assignTutor', { defaultValue: 'Assign Tutor' })}
      </Button>
    </div>
  );
}
