'use client';

import { UserIcon, XMarkIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import type { AssignmentWithDetails } from '../../../types/assignments';
import Button from '../../ui/Button';

interface TutorAssignmentCardProps {
  tutorId: string;
  tutorName?: string;
  assignments: AssignmentWithDetails[];
  onAssignResident: (tutorId: string) => void;
  onUnassignResident: (tutorId: string, residentId: string, rotationId: string) => void;
  loading?: boolean;
}

export default function TutorAssignmentCard({
  tutorId,
  tutorName,
  assignments,
  onAssignResident,
  onUnassignResident,
  loading = false,
}: TutorAssignmentCardProps) {
  const { t } = useTranslation();

  const handleUnassign = (residentId: string, rotationId: string) => {
    onUnassignResident(tutorId, residentId, rotationId);
  };

  // Group assignments by resident
  const assignmentsByResident = assignments.reduce(
    (acc, assignment) => {
      const residentId = assignment.residentId;
      if (!acc[residentId]) {
        acc[residentId] = {
          residentName: assignment.residentName,
          assignments: [],
        };
      }
      acc[residentId]!.assignments.push(assignment);
      return acc;
    },
    {} as Record<string, { residentName?: string; assignments: AssignmentWithDetails[] }>,
  );

  const totalResidents = Object.keys(assignmentsByResident).length;

  return (
    <div className="card-levitate p-4 space-y-3">
      {/* Header: Tutor Info */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-base truncate">{tutorName || 'Unknown Tutor'}</div>
          <div className="text-sm text-muted">
            {totalResidents} {totalResidents === 1 ? 'resident' : 'residents'} assigned
          </div>
        </div>
      </div>

      {/* Residents List */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted">
          {t('ui.assignedResidents', { defaultValue: 'Assigned Residents' })} ({totalResidents})
        </div>

        {totalResidents > 0 ? (
          <div className="space-y-2">
            {Object.entries(assignmentsByResident).map(
              ([residentId, { residentName, assignments: residentAssignments }]) => (
                <div key={residentId} className="space-y-1">
                  <div className="text-sm font-medium text-foreground">
                    {residentName || 'Unknown Resident'}
                  </div>
                  <div className="space-y-1 ml-2">
                    {residentAssignments.map((assignment, index) => (
                      <div
                        key={`${assignment.id}-${index}`}
                        className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/50 rounded-md px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {assignment.isGlobal ? (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
                                {t('ui.globalAssignment', { defaultValue: 'Global' })}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200">
                                {assignment.rotationName}
                              </span>
                            )}
                          </span>
                        </div>
                        <button
                          onClick={() =>
                            handleUnassign(assignment.residentId, assignment.rotationId)
                          }
                          disabled={loading}
                          className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors disabled:opacity-50"
                          title={t('ui.unassign', { defaultValue: 'Unassign' })}
                        >
                          <XMarkIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="text-sm text-muted italic py-2">
            {t('ui.noResidentsAssigned', { defaultValue: 'No residents assigned' })}
          </div>
        )}
      </div>

      {/* Add Resident Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={() => onAssignResident(tutorId)}
        disabled={loading}
        className="w-full btn-levitate border-blue-500 text-blue-700 hover:bg-blue-50 dark:border-blue-500 dark:text-blue-300 dark:hover:bg-blue-900/30"
      >
        <PlusIcon className="w-4 h-4 mr-2" />
        {t('ui.assignResident', { defaultValue: 'Assign Resident' })}
      </Button>
    </div>
  );
}
