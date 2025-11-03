'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  listUsers,
  updateUsersStatus,
  updateUsersRole,
  listAssignmentsWithDetails,
} from '../../../lib/firebase/admin';
import type { AssignmentWithDetails } from '../../../types/assignments';
import type { UserProfile, Role } from '../../../types/auth';
import { TableSkeleton } from '../../dashboard/Skeleton';
import Button from '../../ui/Button';
import EmptyState, { ChecklistIcon } from '../../ui/EmptyState';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import { Table, THead, TBody, TR, TH, TD, TableWrapper } from '../../ui/Table';
import Toast from '../../ui/Toast';

import AssignmentBadges from './AssignmentBadges';

// Mobile Card Component
function UserCard({
  user,
  userId,
  selected,
  onToggleSelect,
  onApprove,
  onDeny,
  onRoleChange,
  actionLoading,
  assignments,
  t,
}: {
  user: UserProfile;
  userId: string;
  selected: boolean;
  onToggleSelect: (checked: boolean) => void;
  onApprove: () => void;
  onDeny: () => void;
  onRoleChange: (role: Role) => void;
  actionLoading: Record<string, boolean>;
  assignments: AssignmentWithDetails[];
  t: any;
}) {
  return (
    <div className="card-levitate p-4 space-y-3">
      {/* Header: Checkbox + Name + Status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onToggleSelect(e.target.checked)}
            className="mt-0.5 flex-shrink-0 w-4 h-4"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-base text-gray-900 dark:text-gray-50 truncate">{user.fullName || userId}</div>
            <div className="text-sm text-muted truncate">{user.email}</div>
          </div>
        </div>
        <span
          className={
            'inline-flex rounded-full px-2 py-1 text-xs font-medium flex-shrink-0 ' +
            (user.status === 'pending'
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
              : user.status === 'active'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200')
          }
        >
          {user.status}
        </span>
      </div>

      {/* Role Dropdown */}
      <div>
        <Select
          value={user.role}
          onChange={(e) => onRoleChange(e.target.value as Role)}
          disabled={actionLoading[`role-${userId}`]}
          className="w-full text-sm h-9"
        >
          <option value="resident">Resident</option>
          <option value="tutor">Tutor</option>
          <option value="admin">Admin</option>
        </Select>
      </div>

      {/* Assignment Badges (for residents only) */}
      {user.role === 'resident' && (
        <div>
          <div className="text-xs font-medium text-muted mb-1">
            {t('ui.assignedTutors', { defaultValue: 'Assigned Tutors' })}
          </div>
          <AssignmentBadges assignments={assignments} maxVisible={3} className="text-xs" />
        </div>
      )}

      {/* Action Buttons (only for pending) */}
      {user.status === 'pending' && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1 btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
            variant="outline"
            loading={actionLoading[`approve-${userId}`]}
            onClick={onApprove}
          >
            {t('ui.approve')}
          </Button>
          <Button
            size="sm"
            className="flex-1 btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
            variant="outline"
            loading={actionLoading[`deny-${userId}`]}
            onClick={onDeny}
          >
            {t('ui.disable')}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function UserManagementTable() {
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
  const [statusFilter, setStatusFilter] = useState<'pending' | 'active' | 'disabled' | ''>('');
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleRoleChange = async (userId: string, newRole: Role) => {
    setActionLoading((prev) => ({ ...prev, [`role-${userId}`]: true }));
    try {
      await updateUsersRole({ userIds: [userId], role: newRole });
      setToast({
        message: t('ui.roleUpdated'),
        variant: 'success',
      });
      await refresh();
    } catch (error) {
      console.error('Failed to update user role:', error);
      setToast({
        message: t('ui.operationFailed'),
        variant: 'error',
      });
    } finally {
      setActionLoading((prev) => ({ ...prev, [`role-${userId}`]: false }));
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
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter((e.target.value || '') as any)}
            >
              <option value="" disabled>
                {t('ui.status')}
              </option>
              <option value="">{t('ui.all')}</option>
              <option value="pending">{t('ui.pending')}</option>
              <option value="active">{t('ui.active')}</option>
              <option value="disabled">{t('ui.disabled')}</option>
            </Select>
            <Select
              value={roleFilter}
              onChange={(e) => setRoleFilter((e.target.value || '') as any)}
            >
              <option value="" disabled>
                {t('ui.role')}
              </option>
              <option value="">{t('ui.all')}</option>
              <option value="resident">Resident</option>
              <option value="tutor">Tutor</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Input
              placeholder={t('ui.searchUsers') as string}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64"
            />
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
            {/* Mobile: Card Layout */}
            <div className="block md:hidden space-y-3">
              {/* Select All for Mobile */}
              <div className="mb-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={users.length > 0 && users.every((u) => sel[u.uid])}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      const next: Record<string, boolean> = {};
                      users.forEach((u) => (next[u.uid] = checked));
                      setSel(next);
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-gray-900 dark:text-gray-50">Select all ({users.length})</span>
                </label>
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
                    onRoleChange={(role) => handleRoleChange(userId, role)}
                    actionLoading={actionLoading}
                    assignments={getAssignmentsForResident(userId)}
                    t={t}
                  />
                );
              })}
            </div>

            {/* Desktop: Table Layout */}
            <div className="hidden md:block">
              <TableWrapper className="-mx-4 sm:mx-0">
                <div className="inline-block min-w-[48rem] align-top w-full">
                  <Table className="w-full table-auto border-collapse">
                    <THead>
                      <TR>
                        <TH className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-bg border-r border-muted/20">
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
                        <TH className="sticky left-[2.25rem] rtl:left-auto rtl:right-[2.25rem] z-10 bg-bg border-r border-muted/20">
                          {t('ui.fullName')}
                        </TH>
                        <TH className="hidden sm:table-cell">{t('ui.email')}</TH>
                        <TH className="hidden md:table-cell">{t('ui.role')}</TH>
                        <TH className="hidden md:table-cell">{t('ui.status')}</TH>
                        <TH className="hidden lg:table-cell">
                          {t('ui.assignedTutors', { defaultValue: 'Assigned Tutors' })}
                        </TH>
                        <TH className="text-right">{t('ui.open')}</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {users.map((user) => {
                        const userId = (user as any).uid || (user as any).id;
                        return (
                          <TR key={userId}>
                            <TD className="sticky left-0 rtl:left-auto rtl:right-0 z-20 bg-bg border-r border-muted/20">
                              <input
                                type="checkbox"
                                checked={!!sel[userId]}
                                onChange={(e) =>
                                  setSel((s) => ({ ...s, [userId]: e.target.checked }))
                                }
                              />
                            </TD>
                            <TD className="sticky left-[2.25rem] rtl:left-auto rtl:right-[2.25rem] z-10 bg-bg border-r border-muted/20">
                              <span
                                className="block whitespace-nowrap truncate max-w-[16rem]"
                                title={user.fullName || userId}
                              >
                                {user.fullName || userId}
                              </span>
                            </TD>
                            <TD className="break-anywhere hidden sm:table-cell">{user.email}</TD>
                            <TD className="hidden md:table-cell">
                              <span
                                className={
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                                  (user.role === 'admin'
                                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
                                    : user.role === 'tutor'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
                                      : 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200')
                                }
                              >
                                {user.role}
                              </span>
                            </TD>
                            <TD className="hidden md:table-cell">
                              <span
                                className={
                                  'inline-flex rounded-full px-2 py-0.5 text-xs font-medium ' +
                                  (user.status === 'pending'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                                    : user.status === 'active'
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200')
                                }
                              >
                                {user.status}
                              </span>
                            </TD>
                            <TD className="hidden lg:table-cell">
                              {user.role === 'resident' ? (
                                <AssignmentBadges
                                  assignments={getAssignmentsForResident(userId)}
                                  maxVisible={2}
                                />
                              ) : (
                                <span className="text-sm text-muted">-</span>
                              )}
                            </TD>
                            <TD className="text-right">
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2">
                                {user.status === 'pending' && (
                                  <>
                                    <Button
                                      size="sm"
                                      className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                                      variant="outline"
                                      loading={actionLoading[`approve-${userId}`]}
                                      onClick={() => handleApproveUser(userId)}
                                    >
                                      {t('ui.approve')}
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                                      variant="outline"
                                      loading={actionLoading[`deny-${userId}`]}
                                      onClick={() => handleDenyUser(userId)}
                                    >
                                      {t('ui.disable')}
                                    </Button>
                                  </>
                                )}
                                <Select
                                  value={user.role}
                                  onChange={(e) => handleRoleChange(userId, e.target.value as Role)}
                                  disabled={actionLoading[`role-${userId}`]}
                                  className="text-xs h-8"
                                >
                                  <option value="resident">Resident</option>
                                  <option value="tutor">Tutor</option>
                                  <option value="admin">Admin</option>
                                </Select>
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

        <div className="flex flex-col sm:flex-row justify-end gap-2">
          {/* Show selection count on mobile */}
          <div className="text-sm text-muted md:hidden">
            {idsSelected().length > 0 && <span>{idsSelected().length} selected</span>}
          </div>
          <div className="flex gap-2">
            <Button
              className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
              disabled={loading || idsSelected().length === 0}
              loading={bulkActionLoading}
              variant="outline"
              onClick={handleBulkApprove}
            >
              {t('ui.approve')} Selected
            </Button>
            <Button
              className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
              disabled={loading || idsSelected().length === 0}
              loading={bulkActionLoading}
              variant="outline"
              onClick={handleBulkDeny}
            >
              {t('ui.disable')} Selected
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
