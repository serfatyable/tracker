'use client';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import SettingsPanel from '../../components/settings/SettingsPanel';
import TopBar from '../../components/TopBar';
import RotationsPanel from '../../components/admin/rotations/RotationsPanel';
import KPICards from '../../components/admin/overview/KPICards';
import PetitionsTable from '../../components/admin/overview/PetitionsTable';
import ResidentsByRotation from '../../components/admin/overview/ResidentsByRotation';
import TutorLoadTable from '../../components/admin/overview/TutorLoadTable';
import UnassignedQueues from '../../components/admin/overview/UnassignedQueues';
import { useActiveAssignments } from '../../lib/hooks/useActiveAssignments';
import { useUsersByRole } from '../../lib/hooks/useUsersByRole';
import { useActiveRotations } from '../../lib/hooks/useActiveRotations';
import RotationTree from '../../components/admin/rotations/RotationTree';
import RotationOwnersEditor from '../../components/admin/rotations/RotationOwnersEditor';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
import { TabsList, TabsTrigger } from '../../components/ui/Tabs';
import AdminReflectionsTabs from '../../components/admin/reflections/AdminReflectionsTabs';
import Badge from '../../components/ui/Badge';
import Drawer from '../../components/ui/Drawer';
import { Dialog, DialogHeader, DialogFooter } from '../../components/ui/Dialog';
import Toast from '../../components/ui/Toast';
import TodayPanel from '../../components/on-call/TodayPanel';
import NextShiftCard from '../../components/on-call/NextShiftCard';
import TeamForDate from '../../components/on-call/TeamForDate';
import MiniCalendar from '../../components/on-call/MiniCalendar';
import { useMorningMeetingsUpcoming, useMorningMeetingsMonth } from '../../lib/hooks/useMorningClasses';
import Avatar from '../../components/ui/Avatar';
import {
  listUsers,
  listTasks,
  updateUsersStatus,
  updateUsersRole,
  updateTasksStatus,
  ensureDefaultReflectionTemplatesSeeded,
} from '../../lib/firebase/admin';
import { getCurrentUserWithProfile } from '../../lib/firebase/auth';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { getFirebaseStatus } from '../../lib/firebase/client';
import type { Role, UserProfile } from '../../types/auth';

export default function AdminDashboard() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const firebaseOk = getFirebaseStatus().ok;
  const [tab, setTab] = useState<
    'overview' | 'users' | 'tasks' | 'rotations' | 'reflections' | 'settings' | 'morning' | 'oncall'
  >('overview');
  const [openRotationId, setOpenRotationId] = useState<string | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [userSel, setUserSel] = useState<Record<string, boolean>>({});
  const [userSearch, setUserSearch] = useState('');
  const [userCursor, setUserCursor] = useState<any | undefined>(undefined);
  const [hasMoreUsers, setHasMoreUsers] = useState(false);
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [statusFilter, setStatusFilter] = useState<'' | 'pending' | 'active' | 'disabled'>('');
  const [orderBy, setOrderBy] = useState<'createdAt' | 'role' | 'status'>('role');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'approve' | 'disable' | 'role' | null>(null);
  const [confirmRole, setConfirmRole] = useState<Role | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<UserProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<{
    type: 'disable';
    userId: string;
    prevStatus: 'pending' | 'active' | 'disabled';
  } | null>(null);
  const [loadingMoreUsers, setLoadingMoreUsers] = useState(false);

  function renderRoleBadge(role: Role) {
    const roleClass =
      role === 'resident'
        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
        : role === 'tutor'
          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200'
          : 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200';
    return (
      <Badge variant="outline" className={roleClass}>
        {t(`roles.${role}`)}
      </Badge>
    );
  }

  function renderStatusBadge(status: 'pending' | 'active' | 'disabled') {
    const statusClass =
      status === 'active'
        ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
        : status === 'pending'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    return (
      <Badge variant="outline" className={statusClass}>
        {status}
      </Badge>
    );
  }
  const [tasks, setTasks] = useState<any[]>([]);
  const [taskSel, setTaskSel] = useState<Record<string, boolean>>({});
  const [taskFilter, setTaskFilter] = useState<'pending' | 'approved' | 'rejected' | ''>('');
  const [taskCursor, setTaskCursor] = useState<any | undefined>(undefined);
  const [hasMoreTasks, setHasMoreTasks] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'users') {
        try {
          const u = await listUsers({
            limit: 25,
            search: userSearch || undefined,
            role: roleFilter || undefined,
            status: statusFilter || undefined,
            orderBy,
            orderDir,
          });
          setUsers(u.items);
          setUserCursor(u.lastCursor as any);
          setHasMoreUsers((u.items?.length || 0) >= 25);
          setUserSel({});
        } catch (err) {
          // Fallback: minimal query to avoid index issues
          const u = await listUsers({ limit: 25 });
          setUsers(u.items);
          setUserCursor(u.lastCursor as any);
          setHasMoreUsers((u.items?.length || 0) >= 25);
          setUserSel({});
        }
      }
      if (tab === 'tasks') {
        const t = await listTasks({ limit: 25, status: taskFilter || undefined });
        setTasks(t.items);
        setTaskCursor(t.lastCursor as any);
        setHasMoreTasks((t.items?.length || 0) >= 25);
        setTaskSel({});
      }
    } finally {
      setLoading(false);
    }
  }, [tab, userSearch, roleFilter, statusFilter, orderBy, orderDir, taskFilter]);

  useEffect(() => {
    if (!firebaseOk) return;
    (async () => {
      const { firebaseUser, profile } = await getCurrentUserWithProfile();
      if (!firebaseUser) return router.replace('/auth');
      if (!profile || profile.status === 'pending') return router.replace('/awaiting-approval');
      if (profile.role !== 'admin') return router.replace('/auth');
      // Ensure core rotations exist each time an admin enters
      try {
        const mod = await import('../../lib/firebase/admin');
        if (typeof mod.ensureCoreRotationsSeeded === 'function') {
          await mod.ensureCoreRotationsSeeded();
        }
        if (typeof mod.ensureDefaultReflectionTemplatesSeeded === 'function') {
          await mod.ensureDefaultReflectionTemplatesSeeded();
        }
      } catch (e) {
        console.error('Core rotations seeding failed', e);
      }
      await refresh();
    })();
  }, [router, firebaseOk, refresh]);

  const filteredUsers = users; // server-side search

  function idsFrom(sel: Record<string, boolean>) {
    return Object.keys(sel).filter((k) => sel[k]);
  }

  async function bulkApproveUsers() {
    if (!idsFrom(userSel).length) return;
    await updateUsersStatus({ userIds: idsFrom(userSel), status: 'active' });
    await refresh();
  }
  async function bulkDisableUsers() {
    if (!idsFrom(userSel).length) return;
    await updateUsersStatus({ userIds: idsFrom(userSel), status: 'disabled' });
    await refresh();
  }
  async function bulkChangeRole(role: Role) {
    if (!idsFrom(userSel).length) return;
    await updateUsersRole({ userIds: idsFrom(userSel), role });
    await refresh();
  }

  function openUserDrawer(u: UserProfile) {
    setSelectedUser(u);
  }
  function closeUserDrawer() {
    setSelectedUser(null);
  }

  function askConfirm(action: 'approve' | 'disable' | 'role', user: UserProfile, role?: Role) {
    setConfirmAction(action);
    setConfirmTarget(user);
    setConfirmRole(role || null);
    setConfirmOpen(true);
  }

  async function executeConfirm() {
    if (!confirmTarget || !confirmAction) return;
    const target = confirmTarget;
    setConfirmOpen(false);
    if (confirmAction === 'approve') {
      await updateUsersStatus({ userIds: [target.uid], status: 'active' });
      await refresh();
    } else if (confirmAction === 'disable') {
      const prev = target.status;
      await updateUsersStatus({ userIds: [target.uid], status: 'disabled' });
      setLastAction({ type: 'disable', userId: target.uid, prevStatus: prev });
      setToastMessage('Disabled user');
      await refresh();
    } else if (confirmAction === 'role' && confirmRole) {
      await updateUsersRole({ userIds: [target.uid], role: confirmRole });
      await refresh();
    }
    setConfirmAction(null);
    setConfirmTarget(null);
    setConfirmRole(null);
  }

  async function undoLast() {
    if (!lastAction) return;
    if (lastAction.type === 'disable') {
      await updateUsersStatus({ userIds: [lastAction.userId], status: lastAction.prevStatus });
      await refresh();
    }
    setLastAction(null);
  }

  async function loadMoreUsers() {
    if (!userCursor || loadingMoreUsers) return;
    setLoadingMoreUsers(true);
    try {
      const u = await listUsers({
        limit: 25,
        startAfter: userCursor,
        search: userSearch || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        orderBy,
        orderDir,
      });
      setUsers((prev) => [...prev, ...u.items]);
      setUserCursor(u.lastCursor as any);
      setHasMoreUsers((u.items?.length || 0) >= 25);
      setUserSel({});
    } finally {
      setLoadingMoreUsers(false);
    }
  }

  function toggleSort(field: 'role' | 'status') {
    if (orderBy === field) {
      setOrderDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(field);
      setOrderDir('asc');
    }
  }
  async function bulkApproveTasks() {
    if (!idsFrom(taskSel).length) return;
    await updateTasksStatus({ taskIds: idsFrom(taskSel), status: 'approved' });
    await refresh();
  }
  async function bulkRejectTasks() {
    if (!idsFrom(taskSel).length) return;
    await updateTasksStatus({ taskIds: idsFrom(taskSel), status: 'rejected' });
    await refresh();
  }

  if (!firebaseOk) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="glass-card p-4 text-sm text-red-700">
          Firebase is not configured. Check your .env.local.
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopBar />
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-stretch justify-start p-6">
        <div className="glass-card w-full p-4">
            <div className="mb-4 flex items-center justify-between">
              <TabsList>
              <TabsTrigger active={tab === 'overview'} onClick={() => setTab('overview')}>
                {t('ui.dashboard') || 'Dashboard'}
              </TabsTrigger>
              <TabsTrigger active={tab === 'users'} onClick={() => setTab('users')}>
                {t('tutor.tabs.residents') || t('roles.resident') || 'Residents'}
              </TabsTrigger>
              <TabsTrigger active={tab === 'tasks'} onClick={() => setTab('tasks')}>
                {t('ui.tasks')}
              </TabsTrigger>
              <TabsTrigger active={tab === 'rotations'} onClick={() => setTab('rotations')}>
                {t('ui.rotations')}
              </TabsTrigger>
              <TabsTrigger active={tab === 'reflections'} onClick={() => setTab('reflections')}>
                Reflections
              </TabsTrigger>
                <button
                  className={`tab-levitate px-3 py-2 text-sm ${tab === 'morning' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('morning')}
                >
                  {t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}
                </button>
                <button
                  className={`tab-levitate px-3 py-2 text-sm ${tab === 'oncall' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('oncall')}
                >
                  {t('ui.onCall', { defaultValue: 'On Call' })}
                </button>
                <Link
                  href="/on-call"
                  className={`tab-levitate px-3 py-2 text-sm ${
                    pathname?.startsWith('/on-call') ? 'ring-1 ring-blue-500' : ''
                  }`}
                >
                  {t('ui.onCall', { defaultValue: 'On Call' })}
                </Link>
              <TabsTrigger active={tab === 'settings'} onClick={() => setTab('settings')}>
                {t('ui.settings')}
              </TabsTrigger>
              </TabsList>
            <div />
          </div>

          {tab === 'overview' ? (
            <div className="space-y-4">
              <div className="glass-card p-4">
                <PetitionsTable />
              </div>
              <OverviewTab />
            </div>
          ) : tab === 'morning' ? (
            <AdminMorningMeetingsInline />
          ) : tab === 'oncall' ? (
            <AdminOnCallInline />
          ) : tab === 'users' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex w-full items-center gap-2">
                  <Input
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={(t('ui.searchUsers') as string) + '...'}
                  />
                  <Select
                    value={roleFilter || ''}
                    onChange={(e) => setRoleFilter((e.target.value || '') as Role | '')}
                  >
                    <option value="">{t('ui.role')}</option>
                    <option value="resident">{t('roles.resident')}</option>
                    <option value="tutor">{t('roles.tutor')}</option>
                    <option value="admin">{t('roles.admin')}</option>
                  </Select>
                  <Select
                    value={statusFilter || ''}
                    onChange={(e) => setStatusFilter((e.target.value || '') as any)}
                  >
                    <option value="">{t('ui.status')}</option>
                    <option value="pending">Pending</option>
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </Select>
                </div>
                {/* bulk actions removed; actions live in the drawer */}
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredUsers.length > 0 && filteredUsers.every((u) => userSel[u.uid])
                          }
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next: Record<string, boolean> = {};
                            filteredUsers.forEach((u) => {
                              next[u.uid] = checked;
                            });
                            setUserSel(next);
                          }}
                        />
                      </TH>
                      <TH>{t('ui.fullName')}</TH>
                      <TH>{t('ui.email')}</TH>
                      <TH>
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort('role')}
                        >
                          <span>{t('ui.role')}</span>
                          <span className="text-xs text-gray-500">
                            {orderBy === 'role' ? (orderDir === 'asc' ? '▲' : '▼') : ''}
                          </span>
                        </button>
                      </TH>
                      <TH>
                        <button
                          className="inline-flex items-center gap-1"
                          onClick={() => toggleSort('status')}
                        >
                          <span>{t('ui.status')}</span>
                          <span className="text-xs text-gray-500">
                            {orderBy === 'status' ? (orderDir === 'asc' ? '▲' : '▼') : ''}
                          </span>
                        </button>
                      </TH>
                    </TR>
                  </THead>
                  <TBody>
                    {filteredUsers.map((u) => (
                      <TR key={u.uid} className="cursor-pointer" onClick={() => openUserDrawer(u)}>
                        <TD className="w-8" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={!!userSel[u.uid]}
                            onChange={(e) =>
                              setUserSel((s) => ({ ...s, [u.uid]: e.target.checked }))
                            }
                          />
                        </TD>
                        <TD>
                          <div className="flex items-center gap-2">
                            <Avatar name={u.fullName} />
                            <span>{u.fullName || '-'}</span>
                          </div>
                        </TD>
                        <TD>{u.email || '-'}</TD>
                        <TD>{renderRoleBadge(u.role)}</TD>
                        <TD>{renderStatusBadge(u.status)}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2">
                <Button disabled={loadingMoreUsers || !hasMoreUsers} onClick={loadMoreUsers}>
                  {t('ui.next')}
                </Button>
              </div>

              <Drawer
                open={!!selectedUser}
                onClose={closeUserDrawer}
                title={selectedUser?.fullName || 'User'}
              >
                {selectedUser ? (
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-500">Email:</span>{' '}
                      <span>{selectedUser.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{t('ui.role')}:</span>
                      {renderRoleBadge(selectedUser.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{t('ui.status')}:</span>
                      {renderStatusBadge(selectedUser.status)}
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                        variant="outline"
                        onClick={() => askConfirm('approve', selectedUser)}
                        disabled={selectedUser.status === 'active'}
                      >
                        {t('ui.approve')}
                      </Button>
                      <Button
                        size="sm"
                        className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                        variant="outline"
                        onClick={() => askConfirm('disable', selectedUser)}
                        disabled={selectedUser.status === 'disabled'}
                      >
                        {t('ui.disable')}
                      </Button>
                      <Select
                        aria-label="Change role"
                        defaultValue=""
                        onChange={(e) =>
                          e.target.value && askConfirm('role', selectedUser, e.target.value as Role)
                        }
                      >
                        <option value="" disabled>
                          {t('ui.changeRole')}
                        </option>
                        <option value="resident">{t('roles.resident')}</option>
                        <option value="tutor">{t('roles.tutor')}</option>
                        <option value="admin">{t('roles.admin')}</option>
                      </Select>
                    </div>
                  </div>
                ) : null}
              </Drawer>

              <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
                <DialogHeader>
                  {confirmAction === 'approve'
                    ? t('ui.confirmApproveUser') || 'Approve user?'
                    : confirmAction === 'disable'
                      ? t('ui.confirmDisableUser') || 'Disable user?'
                      : t('ui.confirmChangeRole') || 'Change role?'}
                </DialogHeader>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {confirmAction === 'role' && confirmRole
                    ? (t('ui.changeRoleTo', {
                        name: confirmTarget?.fullName || 'user',
                        role: confirmRole,
                      }) as string)
                    : (t('ui.applyToUser', { name: confirmTarget?.fullName || 'user' }) as string)}
                </div>
                <DialogFooter>
                  <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
                    {t('ui.cancel')}
                  </Button>
                  <Button onClick={executeConfirm}>{t('ui.approve')}</Button>
                </DialogFooter>
              </Dialog>

              <Toast
                message={toastMessage}
                onClear={() => setToastMessage(null)}
                actionLabel={t('ui.undo') as string}
                onAction={undoLast}
              />
            </div>
          ) : tab === 'tasks' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Select value={taskFilter} onChange={(e) => setTaskFilter(e.target.value as any)}>
                  <option value="">All</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </Select>
                <div className="flex items-center gap-2">
                  <Button
                    className="btn-levitate border-green-500 text-green-700 hover:bg-green-50 dark:border-green-500 dark:text-green-300 dark:hover:bg-green-900/30"
                    variant="outline"
                    onClick={bulkApproveTasks}
                    disabled={loading || idsFrom(taskSel).length === 0}
                  >
                    {t('ui.approve')}
                  </Button>
                  <Button
                    className="btn-levitate border-red-500 text-red-700 hover:bg-red-50 dark:border-red-500 dark:text-red-300 dark:hover:bg-red-900/30"
                    variant="outline"
                    onClick={bulkRejectTasks}
                    disabled={loading || idsFrom(taskSel).length === 0}
                  >
                    Reject
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>
                        <input
                          type="checkbox"
                          checked={tasks.length > 0 && tasks.every((t) => taskSel[t.id])}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            const next: Record<string, boolean> = {};
                            tasks.forEach((t) => {
                              next[t.id] = checked;
                            });
                            setTaskSel(next);
                          }}
                        />
                      </TH>
                      <TH>User</TH>
                      <TH>Rotation</TH>
                      <TH>Item</TH>
                      <TH>Count</TH>
                      <TH>Required</TH>
                      <TH>{t('ui.status')}</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {tasks.map((t) => (
                      <TR key={t.id}>
                        <TD>
                          <input
                            type="checkbox"
                            checked={!!taskSel[t.id]}
                            onChange={(e) =>
                              setTaskSel((s) => ({ ...s, [t.id]: e.target.checked }))
                            }
                          />
                        </TD>
                        <TD>{t.userId}</TD>
                        <TD>{t.rotationId}</TD>
                        <TD>{t.itemId}</TD>
                        <TD>{t.count}</TD>
                        <TD>{t.requiredCount}</TD>
                        <TD>{t.status}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  disabled={loading}
                  onClick={async () => {
                    setTaskCursor(undefined);
                    await refresh();
                  }}
                >
                  {t('ui.first')}
                </Button>
                <Button
                  disabled={loading || !hasMoreTasks}
                  onClick={async () => {
                    if (!taskCursor) return;
                    setLoading(true);
                    try {
                      const t = await listTasks({
                        limit: 25,
                        startAfter: taskCursor,
                        status: taskFilter || undefined,
                      });
                      setTasks(t.items);
                      setTaskCursor(t.lastCursor as any);
                      setHasMoreTasks((t.items?.length || 0) >= 25);
                      setTaskSel({});
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  {t('ui.next')}
                </Button>
              </div>
            </div>
          ) : tab === 'rotations' ? (
            <div className="space-y-3">
              {openRotationId ? (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <button className="btn-levitate" onClick={() => setOpenRotationId(null)}>
                      {t('ui.back')}
                    </button>
                  </div>
                  <RotationOwnersEditor rotationId={openRotationId} />
                  <RotationTree rotationId={openRotationId} />
                </div>
              ) : (
                <RotationsPanel onOpenEditor={setOpenRotationId} />
              )}
            </div>
          ) : tab === 'reflections' ? (
            <div className="space-y-3">
              <AdminReflectionsTabs />
            </div>
          ) : (
            <div className="space-y-3">
              <SettingsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTab() {
  const { assignments } = useActiveAssignments();
  const { residents, tutors } = useUsersByRole();
  const { rotations } = useActiveRotations();

  return (
    <div className="space-y-4">
      <KPICards assignments={assignments} residents={residents} tutors={tutors} />
      <ResidentsByRotation
        assignments={assignments}
        rotations={rotations}
        residents={residents}
        tutors={tutors}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <UnassignedQueues assignments={assignments} residents={residents} rotations={rotations} />
        <div className="lg:col-span-2">
          <TutorLoadTable assignments={assignments} tutors={tutors} />
        </div>
      </div>
    </div>
  );
}

function AdminMorningMeetingsInline() {
  const { t, i18n } = useTranslation();
  const { today, tomorrow, next7 } = useMorningMeetingsUpcoming();
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const { list: monthList } = useMorningMeetingsMonth(y, m0);
  const daysInMonth = useMemo(() => new Date(y, m0 + 1, 0).getDate(), [y, m0]);
  const monthByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (monthList || []).forEach((it: any) => {
      const d = new Date(it.date.toDate());
      const dd = d.getDate();
      map[dd] = map[dd] || [];
      map[dd].push(it);
    });
    return map;
  }, [monthList]);
  function renderList(items: any[] | null) {
    if (!items || !items.length) return <div className="opacity-70">{t('morningMeetings.noClasses')}</div>;
    return (
      <ul className="divide-y rounded border">
        {(items || []).map((c: any) => {
          const start = c.date?.toDate?.()?.toLocaleTimeString?.(i18n.language === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' }) || '07:10';
          return (
            <li key={c.id || c.dateKey + c.title} className="p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs opacity-70">{c.lecturer} — {start}</div>
              </div>
            </li>
          );
        })}
      </ul>
    );
  }
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="glass-card p-4">
          <div className="mb-2 font-semibold">{t('morningMeetings.today')}</div>
          {renderList(today)}
        </div>
        <div className="glass-card p-4">
          <div className="mb-2 font-semibold">{t('morningMeetings.tomorrow')}</div>
          {renderList(tomorrow)}
        </div>
        <div className="glass-card p-4">
          <div className="mb-2 font-semibold">{t('morningMeetings.next7')}</div>
          {renderList(next7)}
        </div>
      </div>
      <div className="glass-card p-4">
        <div className="mb-2 font-semibold">{t('morningMeetings.month')}</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <div key={d} className="rounded border p-2 min-h-[80px]">
              <div className="text-xs opacity-70 mb-1">{d}</div>
              <div className="space-y-1">
                {(monthByDay[d] || []).map((c) => (
                  <div key={c.id || c.title} className="truncate">{c.title}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdminOnCallInline() {
  const { data: me } = useCurrentUserProfile();
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <div className="glass-card p-4 space-y-3">
            <div className="text-sm font-medium">{t('onCall.today')}</div>
            <TodayPanel highlightUserId={me?.uid} />
          </div>
        </div>
        <div className="md:col-span-1">
          <div className="glass-card p-4">
            <NextShiftCard userId={me?.uid} />
          </div>
        </div>
      </div>
      <div className="glass-card p-4 space-y-3">
        <div className="text-sm font-medium">{t('onCall.teamOnDate', { date: '' })}</div>
        <TeamForDate />
      </div>
      <div className="glass-card p-4 space-y-3">
        <div className="text-sm font-medium">Timeline</div>
        <MiniCalendar />
      </div>
    </div>
  );
}
