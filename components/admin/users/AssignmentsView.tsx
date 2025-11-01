'use client';

import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  UserGroupIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import {
  listAssignmentsWithDetails,
  listUsers,
  assignTutorToResidentGlobal,
  assignTutorToResidentForRotation,
  unassignTutorFromResident,
  listRotations,
} from '../../../lib/firebase/admin';
import type { AssignmentWithDetails } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';
import type { Rotation } from '../../../types/rotations';
import Button from '../../ui/Button';
import EmptyState, { ChecklistIcon } from '../../ui/EmptyState';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import Toast from '../../ui/Toast';

import AssignmentCard from './AssignmentCard';
import AssignResidentDialog from './AssignResidentDialog';
import AssignTutorDialog from './AssignTutorDialog';
import TutorAssignmentCard from './TutorAssignmentCard';
import UnassignConfirmDialog from './UnassignConfirmDialog';

type ViewMode = 'byResident' | 'byTutor';

export default function AssignmentsView() {
  const { t } = useTranslation();
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [tutors, setTutors] = useState<UserProfile[]>([]);
  const [rotations, setRotations] = useState<Rotation[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('byResident');
  const [searchQuery, setSearchQuery] = useState('');
  const [rotationFilter, setRotationFilter] = useState('');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );

  // Dialog states
  const [assignTutorDialog, setAssignTutorDialog] = useState<{
    isOpen: boolean;
    residentId: string;
    residentName?: string;
    existingTutorIds: string[];
  }>({ isOpen: false, residentId: '', existingTutorIds: [] });

  const [assignResidentDialog, setAssignResidentDialog] = useState<{
    isOpen: boolean;
    tutorId: string;
    tutorName?: string;
    existingResidentIds: string[];
  }>({ isOpen: false, tutorId: '', existingResidentIds: [] });

  const [unassignDialog, setUnassignDialog] = useState<{
    isOpen: boolean;
    residentId: string;
    tutorId: string;
    residentName?: string;
    tutorName?: string;
    rotationName?: string;
    isGlobal?: boolean;
  }>({ isOpen: false, residentId: '', tutorId: '', isGlobal: false });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentsRes, tutorsRes, rotationsRes] = await Promise.all([
        listAssignmentsWithDetails(),
        listUsers({ role: 'tutor', status: 'active', limit: 100 }),
        listRotations({ limit: 100 }),
      ]);

      setAssignments(assignmentsRes);
      setTutors(tutorsRes.items);
      setRotations(rotationsRes.items);
    } catch (error) {
      console.error('Failed to load assignments data:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter assignments based on search and filters
  const filteredAssignments = assignments.filter((assignment) => {
    const matchesSearch =
      !searchQuery ||
      assignment.residentName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      assignment.tutorNames?.some((name) => name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRotation =
      !rotationFilter ||
      assignment.rotationId === rotationFilter ||
      (rotationFilter === 'global' && assignment.isGlobal);

    const matchesUnassigned = !unassignedOnly || assignment.tutorIds.length === 0;

    return matchesSearch && matchesRotation && matchesUnassigned;
  });

  // Group assignments by resident for resident view
  const assignmentsByResident = filteredAssignments.reduce(
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

  // Group assignments by tutor for tutor view
  const assignmentsByTutor = filteredAssignments.reduce(
    (acc, assignment) => {
      assignment.tutorIds.forEach((tutorId) => {
        if (!acc[tutorId]) {
          const tutor = tutors.find((t) => t.uid === tutorId);
          acc[tutorId] = {
            tutorName: tutor?.fullName,
            assignments: [],
          };
        }
        acc[tutorId]!.assignments.push(assignment);
      });
      return acc;
    },
    {} as Record<string, { tutorName?: string; assignments: AssignmentWithDetails[] }>,
  );

  const handleAssignTutor = (residentId: string) => {
    const resident = Object.values(assignmentsByResident).find((r) =>
      r.assignments.some((a) => a.residentId === residentId),
    );
    const existingTutorIds = resident?.assignments.flatMap((a) => a.tutorIds) || [];

    setAssignTutorDialog({
      isOpen: true,
      residentId,
      residentName: resident?.residentName,
      existingTutorIds,
    });
  };

  const handleAssignResident = (tutorId: string) => {
    const tutor = Object.values(assignmentsByTutor).find((t) =>
      t.assignments.some((a) => a.tutorIds.includes(tutorId)),
    );
    const existingResidentIds = tutor?.assignments.map((a) => a.residentId) || [];

    setAssignResidentDialog({
      isOpen: true,
      tutorId,
      tutorName: tutor?.tutorName,
      existingResidentIds,
    });
  };

  const handleUnassign = (
    residentId: string,
    tutorId: string,
    rotationId: string,
    isGlobal?: boolean,
  ) => {
    const assignment = assignments.find(
      (a) => a.residentId === residentId && a.tutorIds.includes(tutorId),
    );

    setUnassignDialog({
      isOpen: true,
      residentId,
      tutorId,
      residentName: assignment?.residentName,
      tutorName: assignment?.tutorNames?.find((_, i) => assignment.tutorIds[i] === tutorId),
      rotationName: assignment?.rotationName,
      isGlobal,
    });
  };

  const handleConfirmAssignTutor = async (tutorId: string, rotationId: string | null) => {
    try {
      if (rotationId) {
        await assignTutorToResidentForRotation(assignTutorDialog.residentId, tutorId, rotationId);
      } else {
        await assignTutorToResidentGlobal(assignTutorDialog.residentId, tutorId);
      }

      setToast({
        message: t('ui.assignmentSuccess', { defaultValue: 'Assignment created successfully' }),
        variant: 'success',
      });

      await loadData();
    } catch (error) {
      console.error('Failed to assign tutor:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    }
  };

  const handleConfirmAssignResident = async (residentId: string, rotationId: string | null) => {
    try {
      if (rotationId) {
        await assignTutorToResidentForRotation(
          residentId,
          assignResidentDialog.tutorId,
          rotationId,
        );
      } else {
        await assignTutorToResidentGlobal(residentId, assignResidentDialog.tutorId);
      }

      setToast({
        message: t('ui.assignmentSuccess', { defaultValue: 'Assignment created successfully' }),
        variant: 'success',
      });

      await loadData();
    } catch (error) {
      console.error('Failed to assign resident:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    }
  };

  const handleConfirmUnassign = async () => {
    try {
      await unassignTutorFromResident(unassignDialog.residentId, unassignDialog.tutorId);

      setToast({
        message: t('ui.unassignmentSuccess', { defaultValue: 'Assignment removed successfully' }),
        variant: 'success',
      });

      await loadData();
    } catch (error) {
      console.error('Failed to unassign tutor:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    }
  };

  return (
    <>
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />

      <div className="space-y-4">
        {/* Header with View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'byResident' ? 'default' : 'outline'}
              onClick={() => setViewMode('byResident')}
              className="flex items-center gap-2"
            >
              <UserGroupIcon className="w-4 h-4" />
              {t('ui.byResident', { defaultValue: 'By Resident' })}
            </Button>
            <Button
              variant={viewMode === 'byTutor' ? 'default' : 'outline'}
              onClick={() => setViewMode('byTutor')}
              className="flex items-center gap-2"
            >
              <AcademicCapIcon className="w-4 h-4" />
              {t('ui.byTutor', { defaultValue: 'By Tutor' })}
            </Button>
          </div>

          <Button
            onClick={loadData}
            loading={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {t('ui.refresh', { defaultValue: 'Refresh' })}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 relative">
            <Input
              placeholder={t('ui.searchAssignments', { defaultValue: 'Search assignments...' })}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10"
            />
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          </div>
          <Select
            value={rotationFilter}
            onChange={(e) => setRotationFilter(e.target.value)}
            className="w-full sm:w-48"
          >
            <option value="">{t('ui.allRotations', { defaultValue: 'All Rotations' })}</option>
            <option value="global">{t('ui.globalAssignment', { defaultValue: 'Global' })}</option>
            {rotations.map((rotation) => (
              <option key={rotation.id} value={rotation.id}>
                {rotation.name}
              </option>
            ))}
          </Select>
          <label className="flex items-center gap-2 whitespace-nowrap">
            <input
              type="checkbox"
              checked={unassignedOnly}
              onChange={(e) => setUnassignedOnly(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm">
              {t('ui.unassignedOnly', { defaultValue: 'Unassigned Only' })}
            </span>
          </label>
        </div>

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card-levitate p-4 space-y-3 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        ) : viewMode === 'byResident' ? (
          Object.keys(assignmentsByResident).length === 0 ? (
            <EmptyState
              icon={<ChecklistIcon />}
              title={t('ui.noAssignmentsFound', { defaultValue: 'No assignments found' })}
              description={
                searchQuery || rotationFilter || unassignedOnly
                  ? t('ui.tryDifferentFilters', { defaultValue: 'Try adjusting your filters' })
                  : t('ui.noAssignmentsYet', {
                      defaultValue: 'No assignments have been created yet',
                    })
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(assignmentsByResident).map(
                ([
                  residentId,
                  { residentName: _residentName, assignments: residentAssignments },
                ]) => {
                  const firstAssignment = residentAssignments[0];
                  if (!firstAssignment) return null;
                  return (
                    <AssignmentCard
                      key={residentId}
                      assignment={firstAssignment}
                      onAssignTutor={handleAssignTutor}
                      onUnassignTutor={(_, tutorId) => {
                        const assignment = residentAssignments.find((a) =>
                          a.tutorIds.includes(tutorId),
                        );
                        if (assignment) {
                          handleUnassign(
                            residentId,
                            tutorId,
                            assignment.rotationId,
                            assignment.isGlobal,
                          );
                        }
                      }}
                      loading={loading}
                    />
                  );
                },
              )}
            </div>
          )
        ) : Object.keys(assignmentsByTutor).length === 0 ? (
          <EmptyState
            icon={<ChecklistIcon />}
            title={t('ui.noAssignmentsFound', { defaultValue: 'No assignments found' })}
            description={
              searchQuery || rotationFilter || unassignedOnly
                ? t('ui.tryDifferentFilters', { defaultValue: 'Try adjusting your filters' })
                : t('ui.noAssignmentsYet', { defaultValue: 'No assignments have been created yet' })
            }
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(assignmentsByTutor).map(
              ([tutorId, { tutorName, assignments: tutorAssignments }]) => (
                <TutorAssignmentCard
                  key={tutorId}
                  tutorId={tutorId}
                  tutorName={tutorName}
                  assignments={tutorAssignments}
                  onAssignResident={handleAssignResident}
                  onUnassignResident={(_, residentId, rotationId) => {
                    const assignment = tutorAssignments.find((a) => a.residentId === residentId);
                    if (assignment) {
                      handleUnassign(residentId, tutorId, rotationId, assignment.isGlobal);
                    }
                  }}
                  loading={loading}
                />
              ),
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <AssignTutorDialog
        isOpen={assignTutorDialog.isOpen}
        onClose={() => setAssignTutorDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAssignTutor}
        residentId={assignTutorDialog.residentId}
        residentName={assignTutorDialog.residentName}
        existingTutorIds={assignTutorDialog.existingTutorIds}
      />

      <AssignResidentDialog
        isOpen={assignResidentDialog.isOpen}
        onClose={() => setAssignResidentDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmAssignResident}
        tutorId={assignResidentDialog.tutorId}
        tutorName={assignResidentDialog.tutorName}
        existingResidentIds={assignResidentDialog.existingResidentIds}
      />

      <UnassignConfirmDialog
        isOpen={unassignDialog.isOpen}
        onClose={() => setUnassignDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleConfirmUnassign}
        residentName={unassignDialog.residentName}
        tutorName={unassignDialog.tutorName}
        rotationName={unassignDialog.rotationName}
        isGlobal={unassignDialog.isGlobal}
      />
    </>
  );
}
