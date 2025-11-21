'use client';

import {
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  NoSymbolIcon,
} from '@heroicons/react/24/outline';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  listUsers,
  updateUsersStatus,
  listAssignmentsWithDetails,
  unassignResidentFromRotation,
  activateResidentRotation,
  assignTutorToResidentGlobal,
  assignTutorToResidentForRotation,
} from '../../../lib/firebase/admin';
import { useRotations } from '../../../lib/hooks/useRotations';
import type { AssignmentWithDetails } from '../../../types/assignments';
import type { UserProfile, Role } from '../../../types/auth';
import type { Rotation } from '../../../types/rotations';
import { TableSkeleton } from '../../dashboard/Skeleton';
import Button from '../../ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../ui/Dialog';
import EmptyState, { ChecklistIcon } from '../../ui/EmptyState';
import Input from '../../ui/Input';
import { Table, THead, TBody, TR, TH, TD, TableWrapper } from '../../ui/Table';
import Toast from '../../ui/Toast';

import AssignmentBadges from './AssignmentBadges';
import AssignTutorDialog from './AssignTutorDialog';

const statusToneClasses: Record<UserProfile['status'], string> = {
  pending:
    'border-amber-500/70 text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-900/30',
  active: 'border-emerald-500/70 text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/30',
  disabled: 'border-rose-500/70 text-rose-800 dark:text-rose-200 bg-rose-50 dark:bg-rose-900/30',
};

const roleToneClasses: Record<Role, string> = {
  resident:
    'border-cyan-500/70 text-cyan-700 dark:text-cyan-200 bg-cyan-50 dark:bg-cyan-900/30',
  tutor: 'border-sky-500/70 text-sky-700 dark:text-sky-200 bg-sky-50 dark:bg-sky-900/30',
  admin: 'border-purple-500/70 text-purple-700 dark:text-purple-200 bg-purple-50 dark:bg-purple-900/30',
};

const chipBaseClass =
  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/70 focus-visible:ring-offset-2';
const chipInactiveClass =
  'border-muted/40 text-muted hover:border-muted hover:text-foreground dark:border-muted/60 dark:text-muted dark:hover:text-foreground';

const chipActiveClass =
  'bg-blue-600 text-white border-blue-600 shadow shadow-blue-500/30 hover:bg-blue-500';

const statusChipActiveMap: Record<'pending' | 'active' | 'disabled' | '', string> = {
  '': chipActiveClass,
  pending: 'border-amber-500 bg-amber-500 text-white shadow-amber-500/30',
  active: 'border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/30',
  disabled: 'border-rose-500 bg-rose-500 text-white shadow-rose-500/30',
};

const roleChipActiveMap: Record<Role | '', string> = {
  '': chipActiveClass,
  resident: 'border-cyan-500 bg-cyan-500 text-white shadow-cyan-500/30',
  tutor: 'border-sky-500 bg-sky-500 text-white shadow-sky-500/30',
  admin: 'border-purple-500 bg-purple-500 text-white shadow-purple-500/30',
};

type StatusFilterValue = '' | 'pending' | 'active' | 'disabled';
type RoleFilterValue = Role | '';

type IconType = typeof ClockIcon;

function StatusPill({ status }: { status: UserProfile['status'] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${statusToneClasses[status]}`}
    >
      {status}
    </span>
  );
}

function RolePill({ role }: { role: Role }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleToneClasses[role]}`}
    >
      {role}
    </span>
  );
}

function AvatarBadge({ name, fallback }: { name?: string | null; fallback: string }) {
  const initials = getInitials(name || fallback);
  return (
    <div className="hidden md:flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold uppercase text-blue-700 dark:bg-blue-900/40 dark:text-blue-200">
      {initials}
    </div>
  );
}

function getInitials(value?: string) {
  if (!value) return '??';
  const parts = value.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]!.charAt(0) + parts[1]!.charAt(0)).toUpperCase();
}

function FilterChip({
  label,
  active,
  onClick,
  activeClass,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeClass: string;
  icon?: IconType;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${chipBaseClass} ${active ? activeClass : chipInactiveClass}`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
      <span>{label}</span>
    </button>
  );
}

function QuickStatCard({
  label,
  value,
  description,
  icon: Icon,
  toneClass,
}: {
  label: string;
  value: number;
  description: string;
  icon: IconType;
  toneClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 p-4 text-gray-900 shadow-sm shadow-slate-200/50 backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 dark:text-gray-50">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
          <p className="text-2xl font-semibold">{value}</p>
          <p className="text-xs text-muted">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Mobile Card Component
function UserCard({
  user,
  userId,
  selected,
  onToggleSelect,
  onApprove,
  onDeny,
  actionLoading,
  assignments,
  t,
  onManageRotations,
  onAssignTutor,
}: {
  user: UserProfile;
  userId: string;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onApprove: () => void;
  onDeny: () => void;
  actionLoading: Record<string, boolean>;
  assignments: AssignmentWithDetails[];
  t: any;
  onManageRotations: () => void;
  onAssignTutor: () => void;
}) {
  const displayName = user.fullName || userId;
  return (
    <div className="card-levitate space-y-4 p-4">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onToggleSelect(e.target.checked)}
          className="mt-2 h-4 w-4 flex-shrink-0"
        />
        <div className="flex-1 space-y-1">
          <div className="text-base font-semibold text-gray-900 dark:text-gray-50">{displayName}</div>
          <div className="text-sm text-muted break-anywhere">{user.email}</div>
          <div className="flex flex-wrap gap-1.5">
            <StatusPill status={user.status} />
            <RolePill role={user.role} />
          </div>
        </div>
      </div>

      {user.role === 'resident' && (
        <div>
          <div className="mb-1 text-xs font-medium text-muted">
            {t('ui.assignedTutors', { defaultValue: 'Assigned Tutors' })}
          </div>
          <AssignmentBadges
            assignments={assignments}
            maxVisible={3}
            className="text-xs"
            onManageRotations={onManageRotations}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {user.status === 'pending' ? (
          <>
            <Button
              size="sm"
              className="btn-levitate flex-1 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
              variant="outline"
              loading={actionLoading[`approve-${userId}`]}
              onClick={onApprove}
            >
              {t('ui.approve')}
            </Button>
            <Button
              size="sm"
              className="btn-levitate flex-1 border-rose-500 text-rose-700 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-200 dark:hover:bg-rose-900/30"
              variant="outline"
              loading={actionLoading[`deny-${userId}`]}
              onClick={onDeny}
            >
              {t('ui.disable')}
            </Button>
          </>
        ) : null}
        {user.role === 'resident' && user.status !== 'pending' && (
          <>
            <Button size="sm" variant="outline" className="btn-levitate flex-1" onClick={onAssignTutor}>
              {t('admin.users.assignTutor', { defaultValue: 'Assign Tutor' })}
            </Button>
            <Button size="sm" variant="ghost" className="btn-levitate flex-1" onClick={onManageRotations}>
              {t('admin.users.manageRotations', { defaultValue: 'Manage rotations' })}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

interface ManageRotationsDialogProps {
  isOpen: boolean;
  residentName: string;
  assignments: AssignmentWithDetails[];
  allRotations: Rotation[];
  onClose: () => void;
  onUnassign: (assignment: AssignmentWithDetails) => void;
  onAssign: (rotationId: string) => void;
  unassigningRotationId: string | null;
  assigningRotationId: string | null;
}

function ManageRotationsDialog({
  isOpen,
  residentName,
  assignments,
  allRotations,
  onClose,
  onUnassign,
  onAssign,
  unassigningRotationId,
  assigningRotationId,
}: ManageRotationsDialogProps) {
  const { t, i18n } = useTranslation();

  const title = t('admin.users.manageRotationsFor', {
    defaultValue: 'Manage rotations for {{name}}',
    name: residentName,
  });

  // Create a map of rotation assignments by rotationId
  const assignmentMap = new Map(assignments.map((a) => [a.rotationId, a]));

  return (
    <Dialog open={isOpen} onClose={onClose}>
      <DialogHeader>{title}</DialogHeader>

      {allRotations.length === 0 ? (
        <p className="text-sm text-muted">
          {t('admin.users.noRotationsAvailable', {
            defaultValue: 'No rotations available.',
          })}
        </p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {allRotations.map((rotation) => {
            const assignment = assignmentMap.get(rotation.id);
            const rotationName =
              i18n.language === 'he' && rotation.name_he
                ? rotation.name_he
                : rotation.name_en || rotation.name;
            const isActive = assignment?.status === 'active';
            const isInactive = assignment?.status === 'inactive';
            const isFinished = assignment?.status === 'finished';

            let statusLabel = '';
            let statusColor = '';

            if (isActive) {
              statusLabel = t('assignments.status.active', { defaultValue: 'Active' });
              statusColor = 'text-green-600 dark:text-green-400';
            } else if (isInactive) {
              statusLabel = t('assignments.status.inactive', { defaultValue: 'Inactive' });
              statusColor = 'text-yellow-600 dark:text-yellow-400';
            } else if (isFinished) {
              statusLabel = t('assignments.status.finished', { defaultValue: 'Finished' });
              statusColor = 'text-gray-600 dark:text-gray-400';
            }

            return (
              <div
                key={rotation.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-muted/40 bg-surface p-3"
              >
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">{rotationName}</div>
                  {statusLabel && (
                    <div className={`text-xs ${statusColor} capitalize`}>{statusLabel}</div>
                  )}
                </div>
                <div className="flex gap-2">
                  {assignment ? (
                    <>
                      {isActive && (
                        <Button
                          size="sm"
                          variant="outline"
                          loading={unassigningRotationId === rotation.id}
                          onClick={() => onUnassign(assignment)}
                        >
                          {t('ui.unassign', { defaultValue: 'Unassign' })}
                        </Button>
                      )}
                      {(isInactive || isFinished) && (
                        <Button
                          size="sm"
                          variant="default"
                          loading={assigningRotationId === rotation.id}
                          onClick={() => onAssign(rotation.id)}
                        >
                          {t('admin.users.assignRotation', { defaultValue: 'Assign' })}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="default"
                      loading={assigningRotationId === rotation.id}
                      onClick={() => onAssign(rotation.id)}
                    >
                      {t('admin.users.assignRotation', { defaultValue: 'Assign' })}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          {t('ui.close', { defaultValue: 'Close' })}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

const UserManagementTable = memo(function UserManagementTable() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' } | null>(
    null,
  );
  const [manageDialog, setManageDialog] = useState<{
    residentId: string;
    residentName: string;
  } | null>(null);
  const [assignTutorDialog, setAssignTutorDialog] = useState<{
    residentId: string;
    residentName: string;
  } | null>(null);
  const [unassigningRotationId, setUnassigningRotationId] = useState<string | null>(null);
  const [assigningRotationId, setAssigningRotationId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'disabled' | ''>('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all rotations
  const { rotations } = useRotations();

  const statusCounts = useMemo(() => {
    return users.reduce(
      (acc, user) => {
        const status = user.status as UserProfile['status'];
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      { pending: 0, active: 0, disabled: 0 } as Record<UserProfile['status'], number>,
    );
  }, [users]);

  const quickStats = useMemo(
    () => [
      {
        id: 'pending',
        value: statusCounts.pending,
        label: t('ui.pending', { defaultValue: 'Pending' }),
        description: t('admin.users.pendingSummary', {
          defaultValue: 'Awaiting approval',
        }) as string,
        icon: ClockIcon,
        toneClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-100',
      },
      {
        id: 'active',
        value: statusCounts.active,
        label: t('ui.active', { defaultValue: 'Active' }),
        description: t('admin.users.activeSummary', {
          defaultValue: 'Ready to assign',
        }) as string,
        icon: CheckCircleIcon,
        toneClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-100',
      },
      {
        id: 'disabled',
        value: statusCounts.disabled,
        label: t('ui.disabled', { defaultValue: 'Disabled' }),
        description: t('admin.users.disabledSummary', {
          defaultValue: 'Need attention',
        }) as string,
        icon: NoSymbolIcon,
        toneClass: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-100',
      },
    ],
    [statusCounts, t],
  );

  const statusChipOptions = useMemo(
    () => [
      {
        value: '' as StatusFilterValue,
        label: t('ui.allStatuses', { defaultValue: 'All statuses' }) as string,
        icon: FunnelIcon,
      },
      { value: 'pending' as StatusFilterValue, label: t('ui.pending', { defaultValue: 'Pending' }) as string },
      { value: 'active' as StatusFilterValue, label: t('ui.active', { defaultValue: 'Active' }) as string },
      { value: 'disabled' as StatusFilterValue, label: t('ui.disabled', { defaultValue: 'Disabled' }) as string },
    ],
    [t],
  );

  const roleChipOptions = useMemo(
    () => [
      { value: '' as RoleFilterValue, label: t('ui.allRoles', { defaultValue: 'All roles' }) as string },
      { value: 'resident' as RoleFilterValue, label: t('roles.resident', { defaultValue: 'Resident' }) as string },
      { value: 'tutor' as RoleFilterValue, label: t('roles.tutor', { defaultValue: 'Tutor' }) as string },
      { value: 'admin' as RoleFilterValue, label: t('roles.admin', { defaultValue: 'Admin' }) as string },
    ],
    [t],
  );

  const filtersApplied = Boolean(statusFilter || roleFilter || searchQuery);
  const selectedIdsList = idsSelected();
  const selectedCount = selectedIdsList.length;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, assignmentsRes] = await Promise.all([
        listUsers({
          status: statusFilter || undefined,
          role: roleFilter || undefined,
          search: searchQuery || undefined,
          limit: 100,
        }),
        listAssignmentsWithDetails(),
      ]);
      setUsers(usersRes.items);
      setAssignments(assignmentsRes);
      setSel({});
    } catch (error) {
      console.error('Failed to load users:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, roleFilter, searchQuery, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  function idsSelected() {
    return Object.keys(sel).filter((k) => sel[k]);
  }

  function getAssignmentsForResident(residentId: string): AssignmentWithDetails[] {
    return assignments.filter((a) => a.residentId === residentId);
  }

  const openManageRotations = (residentId: string, residentName: string) => {
    setManageDialog({ residentId, residentName });
  };

  const handleCloseManageDialog = () => {
    setManageDialog(null);
    setUnassigningRotationId(null);
    setAssigningRotationId(null);
  };

  const openAssignTutor = (residentId: string, residentName: string) => {
    setAssignTutorDialog({ residentId, residentName });
  };

  const handleCloseAssignTutorDialog = () => {
    setAssignTutorDialog(null);
  };

  const handleAssignTutor = async (tutorId: string, rotationId: string | null) => {
    if (!assignTutorDialog) return;

    try {
      if (rotationId) {
        await assignTutorToResidentForRotation(assignTutorDialog.residentId, tutorId, rotationId);
        setToast({
          message: t('admin.users.tutorAssignedToRotation', {
            defaultValue: 'Tutor assigned to rotation successfully.',
          }),
          variant: 'success',
        });
      } else {
        await assignTutorToResidentGlobal(assignTutorDialog.residentId, tutorId);
        setToast({
          message: t('admin.users.tutorAssignedGlobally', {
            defaultValue: 'Tutor assigned globally to resident.',
          }),
          variant: 'success',
        });
      }
      await refresh();
      handleCloseAssignTutorDialog();
    } catch (error) {
      console.error('Failed to assign tutor:', error);
      throw error; // Let AssignTutorDialog handle the error
    }
  };

  const manageAssignments = manageDialog
    ? getAssignmentsForResident(manageDialog.residentId).filter(
        (assignment) => assignment.status !== 'finished' && !assignment.isGlobal,
      )
    : [];

  const handleUnassignRotation = async (assignment: AssignmentWithDetails) => {
    if (!manageDialog) return;
    if (!assignment.rotationId) return;

    const rotationName =
      assignment.rotationName ||
      t('admin.users.unknownRotation', { defaultValue: 'this rotation' });
    const confirmMessage = t('admin.users.confirmUnassignRotation', {
      defaultValue: 'Are you sure you want to unassign {{resident}} from {{rotation}}?',
      resident: manageDialog.residentName,
      rotation: rotationName,
    });

    if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }

    setUnassigningRotationId(assignment.rotationId);
    try {
      await unassignResidentFromRotation(manageDialog.residentId, assignment.rotationId);
      setToast({
        message: t('admin.users.unassignSuccess', {
          defaultValue: 'Rotation unassigned successfully.',
        }),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to unassign rotation:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setUnassigningRotationId(null);
    }
  };

  const handleAssignRotation = async (rotationId: string) => {
    if (!manageDialog) return;

    // Find if there's an active rotation for this resident
    const activeRotations = assignments.filter(
      (a) => a.residentId === manageDialog.residentId && a.status === 'active' && !a.isGlobal,
    );

    // Prevent assigning if there's already an active rotation
    if (activeRotations.length > 0 && !activeRotations.some((a) => a.rotationId === rotationId)) {
      setToast({
        message: t('admin.users.hasActiveRotation', {
          defaultValue: 'Resident already has an active rotation. Please unassign it first.',
        }),
        variant: 'error',
      });
      return;
    }

    const rotation = rotations.find((r) => r.id === rotationId);
    const rotationName = rotation?.name || rotationId;
    const confirmMessage = t('admin.users.confirmAssignRotation', {
      defaultValue: 'Assign {{rotation}} to {{resident}}?',
      resident: manageDialog.residentName,
      rotation: rotationName,
    });

    if (typeof window !== 'undefined' && !window.confirm(confirmMessage)) {
      return;
    }

    setAssigningRotationId(rotationId);
    try {
      await activateResidentRotation(manageDialog.residentId, rotationId);
      setToast({
        message: t('admin.users.assignSuccess', {
          defaultValue: 'Rotation assigned successfully.',
        }),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to assign rotation:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setAssigningRotationId(null);
    }
  };

  const handleApproveUser = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [`approve-${userId}`]: true }));
    try {
      await updateUsersStatus({ userIds: [userId], status: 'active' });
      setToast({
        message: t('ui.userApproved'),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to approve user:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`approve-${userId}`]: false }));
    }
  };

  const handleDenyUser = async (userId: string) => {
    setActionLoading((prev) => ({ ...prev, [`deny-${userId}`]: true }));
    try {
      await updateUsersStatus({ userIds: [userId], status: 'disabled' });
      setToast({
        message: t('ui.userDenied'),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to deny user:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`deny-${userId}`]: false }));
    }
  };

  const handleBulkApprove = async () => {
    const selectedIds = idsSelected();
    const pendingUsers = selectedIds.filter((id) => {
      const user = users.find((u) => u.uid === id);
      return user && user.status === 'pending';
    });

    if (pendingUsers.length === 0) {
      setToast({
        message: 'No pending users selected',
        variant: 'error',
      });
      return;
    }

    setBulkActionLoading(true);
    try {
      await updateUsersStatus({ userIds: pendingUsers, status: 'active' });
      setToast({
        message: t('ui.bulkApproveSuccess', { count: pendingUsers.length }),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to bulk approve users:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeny = async () => {
    const selectedIds = idsSelected();
    const pendingUsers = selectedIds.filter((id) => {
      const user = users.find((u) => u.uid === id);
      return user && user.status === 'pending';
    });

    if (pendingUsers.length === 0) {
      setToast({
        message: 'No pending users selected',
        variant: 'error',
      });
      return;
    }

    setBulkActionLoading(true);
    try {
      await updateUsersStatus({ userIds: pendingUsers, status: 'disabled' });
      setToast({
        message: t('ui.bulkDenySuccess', { count: pendingUsers.length }),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to bulk deny users:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <>
      <Toast
        message={toast?.message || null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickStats.map((stat) => (
            <QuickStatCard
              key={stat.id}
              label={stat.label}
              value={stat.value}
              description={stat.description}
              icon={stat.icon}
              toneClass={stat.toneClass}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-muted/30 bg-white/90 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80 md:sticky md:top-16 md:z-20">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-muted">
            <span className="inline-flex items-center gap-2">
              <FunnelIcon className="h-4 w-4" />
              {t('ui.filters', { defaultValue: 'Filters' })}
            </span>
            {filtersApplied ? (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setRoleFilter('');
                  setSearchQuery('');
                }}
                className="text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
              </button>
            ) : null}
          </div>
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {statusChipOptions.map((option) => (
                <FilterChip
                  key={option.value || 'all-statuses'}
                  label={option.label}
                  icon={option.icon}
                  active={statusFilter === option.value}
                  activeClass={statusChipActiveMap[option.value]}
                  onClick={() => setStatusFilter(option.value)}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {roleChipOptions.map((option) => (
                <FilterChip
                  key={option.value || 'all-roles'}
                  label={option.label}
                  active={roleFilter === option.value}
                  activeClass={roleChipActiveMap[option.value as Role | '']}
                  onClick={() => setRoleFilter(option.value)}
                />
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-72">
                <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
                <Input
                  placeholder={t('ui.searchUsers', { defaultValue: 'Search users' }) as string}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-11 w-full rounded-xl bg-white/90 pl-9 dark:bg-slate-900/70"
                />
              </div>
              <div className="text-xs font-medium text-muted">
                {t('ui.showingResults', {
                  defaultValue: 'Showing {{count}} results',
                  count: users.length,
                })}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <TableSkeleton rows={3} columns={6} />
        ) : users.length === 0 ? (
          <EmptyState
            icon={<ChecklistIcon />}
            title={t('ui.noUsersFound')}
            description={
              statusFilter || roleFilter || searchQuery
                ? t('ui.tryDifferentFilters')
                : t('ui.allUsers')
            }
          />
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              <div className="mb-1 flex items-center justify-between text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && users.every((u) => sel[u.uid])}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next: Record<string, boolean> = {};
                      users.forEach((u) => (next[u.uid] = checked));
                      setSel(next);
                    }}
                    className="h-4 w-4"
                  />
                  <span className="text-muted">
                    {t('ui.selectAll', { defaultValue: 'Select all' })} ({users.length})
                  </span>
                </label>
                {selectedCount > 0 && (
                  <span className="text-xs text-muted">
                    {selectedCount}{' '}
                    {t('ui.selectedCount_other', {
                      defaultValue: 'selected',
                      count: selectedCount,
                    })}
                  </span>
                )}
              </div>
              {users.map((user) => {
                const userId = (user as any).uid || (user as any).id;
                return (
                  <UserCard
                    key={userId}
                    user={user}
                    userId={userId}
                    selected={!!sel[userId]}
                    onToggleSelect={(checked) => setSel((s) => ({ ...s, [userId]: checked }))}
                    onApprove={() => handleApproveUser(userId)}
                    onDeny={() => handleDenyUser(userId)}
                    actionLoading={actionLoading}
                    assignments={getAssignmentsForResident(userId)}
                    t={t}
                    onManageRotations={() => openManageRotations(userId, user.fullName || userId)}
                    onAssignTutor={() => openAssignTutor(userId, user.fullName || userId)}
                  />
                );
              })}
            </div>

            <div className="hidden md:block">
              <TableWrapper className="-mx-4 sm:mx-0">
                <div className="inline-block w-full min-w-[48rem] align-top">
                  <Table className="w-full table-auto border-collapse">
                    <THead>
                      <TR>
                        <TH className="sticky left-0 z-20 w-12 bg-bg border-r border-muted/20">
                          <input
                            type="checkbox"
                            checked={users.length > 0 && users.every((u) => sel[u.uid])}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const next: Record<string, boolean> = {};
                              users.forEach((u) => (next[u.uid] = checked));
                              setSel(next);
                            }}
                          />
                        </TH>
                        <TH>{t('ui.user', { defaultValue: 'User' })}</TH>
                        <TH className="hidden lg:table-cell">
                          {t('ui.assignedTutors', { defaultValue: 'Assigned Tutors' })}
                        </TH>
                        <TH className="text-right">{t('ui.actions', { defaultValue: 'Actions' })}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {users.map((user) => {
                        const userId = (user as any).uid || (user as any).id;
                        return (
                          <TR key={userId} className="align-middle">
                            <TD className="sticky left-0 z-20 bg-bg border-r border-muted/20">
                              <input
                                type="checkbox"
                                checked={!!sel[userId]}
                                onChange={(e) =>
                                  setSel((s) => ({ ...s, [userId]: e.target.checked }))
                                }
                              />
                            </TD>
                            <TD>
                              <div className="flex items-center gap-3">
                                <AvatarBadge name={user.fullName} fallback={userId} />
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="truncate text-base font-semibold">
                                      {user.fullName || userId}
                                    </span>
                                    {user.status === 'pending' ? (
                                      <span className="text-xs font-medium uppercase tracking-wide text-amber-600 dark:text-amber-300">
                                        {t('ui.awaitingApproval', { defaultValue: 'Awaiting approval' })}
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-sm text-muted break-anywhere">{user.email}</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    <StatusPill status={user.status} />
                                    <RolePill role={user.role} />
                                  </div>
                                </div>
                              </div>
                            </TD>
                            <TD className="hidden lg:table-cell">
                              {user.role === 'resident' ? (
                                <AssignmentBadges
                                  assignments={getAssignmentsForResident(userId)}
                                  maxVisible={2}
                                />
                              ) : (
                                <span className="text-sm text-muted">{t('ui.notApplicable', { defaultValue: 'N/A' })}</span>
                              )}
                            </TD>
                            <TD className="text-right">
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {user.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="btn-levitate border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
                                      variant="outline"
                                      loading={actionLoading[`approve-${userId}`]}
                                      onClick={() => handleApproveUser(userId)}
                                    >
                                      {t('ui.approve')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="btn-levitate border-rose-500 text-rose-700 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-200 dark:hover:bg-rose-900/30"
                                      variant="outline"
                                      loading={actionLoading[`deny-${userId}`]}
                                      onClick={() => handleDenyUser(userId)}
                                    >
                                      {t('ui.disable')}
                                    </Button>
                                  </>
                                )}
                                {user.role === 'resident' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="btn-levitate"
                                      onClick={() =>
                                        openAssignTutor(userId, user.fullName || userId)
                                      }
                                    >
                                      {t('admin.users.assignTutor', { defaultValue: 'Assign Tutor' })}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="btn-levitate"
                                      onClick={() =>
                                        openManageRotations(userId, user.fullName || userId)
                                      }
                                    >
                                      {t('admin.users.manageRotations', {
                                        defaultValue: 'Manage rotations',
                                      })}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TD>
                          </TR>
                        );
                      })}
                    </TBody>
                  </Table>
                </div>
              </TableWrapper>
            </div>
          </>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted md:hidden">
            {selectedCount > 0 && (
              <span>
                {selectedCount}{' '}
                {t('ui.selectedCount_other', {
                  defaultValue: 'selected',
                  count: selectedCount,
                })}
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              className="btn-levitate border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
              disabled={loading || selectedCount === 0}
              loading={bulkActionLoading}
              variant="outline"
              onClick={handleBulkApprove}
            >
              {t('ui.approve', { defaultValue: 'Approve' })}{' '}
              {t('ui.selectedCount_other', {
                defaultValue: 'selected',
                count: selectedCount,
              })}
            </Button>
            <Button
              className="btn-levitate border-rose-500 text-rose-700 hover:bg-rose-50 dark:border-rose-500 dark:text-rose-200 dark:hover:bg-rose-900/30"
              disabled={loading || selectedCount === 0}
              loading={bulkActionLoading}
              variant="outline"
              onClick={handleBulkDeny}
            >
              {t('ui.disable', { defaultValue: 'Disable' })}{' '}
              {t('ui.selectedCount_other', {
                defaultValue: 'selected',
                count: selectedCount,
              })}
            </Button>
          </div>
        </div>
      </div>
      <ManageRotationsDialog
        isOpen={!!manageDialog}
        residentName={manageDialog?.residentName || ''}
        assignments={manageAssignments}
        allRotations={rotations}
        onClose={handleCloseManageDialog}
        onUnassign={handleUnassignRotation}
        onAssign={handleAssignRotation}
        unassigningRotationId={unassigningRotationId}
        assigningRotationId={assigningRotationId}
      />
      <AssignTutorDialog
        isOpen={!!assignTutorDialog}
        onClose={handleCloseAssignTutorDialog}
        onConfirm={handleAssignTutor}
        residentId={assignTutorDialog?.residentId || ''}
        residentName={assignTutorDialog?.residentName || ''}
        existingTutorIds={
          assignTutorDialog
            ? Array.from(
                new Set(
                  getAssignmentsForResident(assignTutorDialog.residentId).flatMap(
                    (a) => a.tutorIds || [],
                  ),
                ),
              )
            : []
        }
      />
    </>
  );
});

export default UserManagementTable;
