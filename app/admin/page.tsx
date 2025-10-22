'use client';
// Unused import removed: Link
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo as _useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import MorningMeetingsView from '../../components/admin/morning-meetings/MorningMeetingsView';
import OnCallScheduleView from '../../components/admin/on-call/OnCallScheduleView';
import RotationsPanel from '../../components/admin/rotations/RotationsPanel';
import { SpinnerSkeleton, CardSkeleton } from '../../components/dashboard/Skeleton';
import AppShell from '../../components/layout/AppShell';
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import Avatar from '../../components/ui/Avatar';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { Dialog, DialogHeader, DialogFooter } from '../../components/ui/Dialog';
import Drawer from '../../components/ui/Drawer';
// Unused import removed: Input
import Select from '../../components/ui/Select';
import { Table, THead, TBody, TR, TH, TD } from '../../components/ui/Table';
// Tabs removed per mobile-first stacked sections
import TextField from '../../components/ui/TextField';
import Toast from '../../components/ui/Toast';
import {
  listUsers,
  listTasks,
  updateUsersStatus,
  updateUsersRole,
  updateTasksStatus,
} from '../../lib/firebase/admin';
import { getCurrentUserWithProfile } from '../../lib/firebase/auth';
import { getFirebaseStatus } from '../../lib/firebase/client';
import { useActiveAssignments } from '../../lib/hooks/useActiveAssignments';
import { useActiveRotations } from '../../lib/hooks/useActiveRotations';
// Unused import removed: useCurrentUserProfile
import { useUsersByRole } from '../../lib/hooks/useUsersByRole';
import type { Role, UserProfile } from '../../types/auth';

// Dynamically load heavy tab components (avoid React.lazy chunk issues in dev)
const KPICards = dynamic(() => import('../../components/admin/overview/KPICards'), {
  loading: () => <CardSkeleton />,
  ssr: false,
});
const PetitionsTable = dynamic(() => import('../../components/admin/overview/PetitionsTable'), {
  loading: () => <SpinnerSkeleton />,
  ssr: false,
});
const ResidentsByRotation = dynamic(
  () => import('../../components/admin/overview/ResidentsByRotation'),
  { loading: () => <CardSkeleton />, ssr: false },
);
const TutorLoadTable = dynamic(() => import('../../components/admin/overview/TutorLoadTable'), {
  loading: () => <SpinnerSkeleton />,
  ssr: false,
});
const UnassignedQueues = dynamic(() => import('../../components/admin/overview/UnassignedQueues'), {
  loading: () => <SpinnerSkeleton />,
  ssr: false,
});
const AdminReflectionsTabs = dynamic(
  () => import('../../components/admin/reflections/AdminReflectionsTabs'),
  { loading: () => <SpinnerSkeleton />, ssr: false },
);
const RotationOwnersEditor = dynamic(
  () => import('../../components/admin/rotations/RotationOwnersEditor'),
  { loading: () => <SpinnerSkeleton />, ssr: false },
);
// RotationsPanel loads synchronously to avoid dev ChunkLoadError during frequent rebuilds
const RotationTree = dynamic(() => import('../../components/admin/rotations/RotationTree'), {
  loading: () => <SpinnerSkeleton />,
  ssr: false,
});
const SettingsPanel = dynamic(() => import('../../components/settings/SettingsPanel'), {
  loading: () => <CardSkeleton />,
  ssr: false,
});

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const firebaseOk = getFirebaseStatus().ok;
  // Removed dashboard tabs; render stacked sections inline
  const [openRotationId, setOpenRotationId] = useState<string | null>(null);
  const [openRotationName, setOpenRotationName] = useState<string>('');
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
          : 'bg-gray-100 text-gray-800 dark:bg-[rgb(var(--surface-elevated))] dark:text-[rgb(var(--fg))]';
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
  const [density, setDensity] = useState<'normal' | 'compact'>(() => {
    if (typeof window === 'undefined') return 'normal';
    return (localStorage.getItem('ui_density') as 'normal' | 'compact') || 'normal';
  });
  useEffect(() => {
    try {
      localStorage.setItem('ui_density', density);
    } catch {
      // localStorage may not be available
    }
  }, [density]);

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
        } catch {
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
  }, [userSearch, roleFilter, statusFilter, orderBy, orderDir, taskFilter, tab]);

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
      } catch {
        // Seeding failed - continue anyway
      }
      await refresh();
    })();
  }, [router, firebaseOk, refresh]);

  // Fetch rotation name when opening rotation editor
  useEffect(() => {
    if (!openRotationId) {
      setOpenRotationName('');
      return;
    }

    (async () => {
      try {
        const { listRotations } = await import('../../lib/firebase/admin');
        const result = await listRotations({ limit: 100 });
        const rotation = result.items.find((r: any) => r.id === openRotationId);

        if (rotation) {
          const name = String(
            i18n.language === 'he'
              ? (rotation as any).name_he || (rotation as any).name_en || (rotation as any).name
              : (rotation as any).name_en || (rotation as any).name,
          );
          setOpenRotationName(name);
        } else {
          setOpenRotationName('Unknown Rotation');
        }
      } catch (error) {
        console.error('Failed to fetch rotation name:', error);
        setOpenRotationName('Rotation');
      }
    })();
  }, [openRotationId, i18n.language]);

  const filteredUsers = users; // server-side search

  function idsFrom(sel: Record<string, boolean>) {
    return Object.keys(sel).filter((k) => sel[k]);
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
    try {
      if (confirmAction === 'approve') {
        await updateUsersStatus({ userIds: [target.uid], status: 'active' });
        await refresh();
      } else if (confirmAction === 'disable') {
        const prev = target.status;
        await updateUsersStatus({ userIds: [target.uid], status: 'disabled' });
        setLastAction({ type: 'disable', userId: target.uid, prevStatus: prev });
        setToastMessage(t('toasts.disabledUser'));
        await refresh();
      } else if (confirmAction === 'role' && confirmRole) {
        await updateUsersRole({ userIds: [target.uid], role: confirmRole });
        await refresh();
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
      setToastMessage(
        t('toasts.failed') + ': ' + (error instanceof Error ? error.message : String(error)),
      );
    } finally {
      setConfirmAction(null);
      setConfirmTarget(null);
      setConfirmRole(null);
    }
  }

  async function undoLast() {
    if (!lastAction) return;
    try {
      if (lastAction.type === 'disable') {
        await updateUsersStatus({ userIds: [lastAction.userId], status: lastAction.prevStatus });
        await refresh();
      }
      setLastAction(null);
    } catch (error) {
      console.error('Failed to undo action:', error);
      setToastMessage(
        t('toasts.failedToUndo') + ': ' + (error instanceof Error ? error.message : String(error)),
      );
    }
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
    } catch (error) {
      console.error('Failed to load more users:', error);
      setToastMessage(
        t('toasts.failedToLoadMoreUsers') +
          ': ' +
          (error instanceof Error ? error.message : String(error)),
      );
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
    try {
      await updateTasksStatus({ taskIds: idsFrom(taskSel), status: 'approved' });
      await refresh();
    } catch (error) {
      console.error('Failed to approve tasks:', error);
      setToastMessage(
        t('toasts.failedToApproveTasks') +
          ': ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }
  async function bulkRejectTasks() {
    if (!idsFrom(taskSel).length) return;
    try {
      await updateTasksStatus({ taskIds: idsFrom(taskSel), status: 'rejected' });
      await refresh();
    } catch (error) {
      console.error('Failed to reject tasks:', error);
      setToastMessage(
        t('toasts.failedToRejectTasks') +
          ': ' +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  if (!firebaseOk) {
    return (
      <div className="min-h-dvh pad-safe-t pad-safe-b flex items-center justify-center p-6">
        <div className="card-levitate p-4 text-sm text-red-700">
          Firebase is not configured. Check your .env.local.
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <LargeTitleHeader title={t('ui.dashboard', { defaultValue: 'Dashboard' }) as string} />
      <div className="app-container flex min-h-dvh pad-safe-t pad-safe-b flex-col items-stretch justify-start p-6">
        <div className="w-full">
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
                {t('ui.reflections')}
              </TabsTrigger>
              <TabsTrigger active={tab === 'morning'} onClick={() => setTab('morning')}>
                {t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}
              </TabsTrigger>
              <TabsTrigger active={tab === 'oncall'} onClick={() => setTab('oncall')}>
                {t('ui.onCall', { defaultValue: 'On Call' })}
              </TabsTrigger>
              <TabsTrigger active={tab === 'settings'} onClick={() => setTab('settings')}>
                {t('ui.settings')}
              </TabsTrigger>
            </TabsList>
            <div />
          </div>

          {tab === 'overview' ? (
            <div className="space-y-4">
              <div className="card-levitate p-4">
                <Suspense fallback={<SpinnerSkeleton />}>
                  <PetitionsTable />
                </Suspense>
              </div>
              <OverviewTab />
            </div>
          ) : tab === 'morning' ? (
            <MorningMeetingsView showUploadButton={true} />
          ) : tab === 'oncall' ? (
            <OnCallScheduleView showUploadButton={true} />
          ) : tab === 'users' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex w-full items-center gap-2">
                  <TextField
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
                    <option value="pending">{t('ui.pending')}</option>
                    <option value="active">{t('ui.active')}</option>
                    <option value="disabled">{t('ui.disabled')}</option>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    className="pill text-xs px-2 py-1"
                    onClick={() => setDensity((d) => (d === 'normal' ? 'compact' : 'normal'))}
                    aria-pressed={density === 'compact'}
                  >
                    {density === 'compact' ? t('ui.compact') : t('ui.normal')}
                  </Button>
                </div>
              </div>
              {/* Mobile cards */}
              <div className="md:hidden grid grid-cols-1 gap-2">
                {filteredUsers.map((u) => (
                  <button
                    key={u.uid}
                    type="button"
                    onClick={() => openUserDrawer(u)}
                    className="card-levitate p-3 text-left"
                    aria-label={u.fullName || u.email || 'User'}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar name={u.fullName} />
                        <div className="min-w-0">
                          <div className="font-medium truncate">{u.fullName || '-'}</div>
                          <div className="text-xs opacity-70 break-anywhere">{u.email || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderRoleBadge(u.role)}
                        {renderStatusBadge(u.status)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <label className="inline-flex items-center gap-2 text-xs opacity-80" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!userSel[u.uid]}
                          onChange={(e) => setUserSel((s) => ({ ...s, [u.uid]: e.target.checked }))}
                        />
                        <span>{t('ui.select') || 'Select'}</span>
                      </label>
                      <span className="text-xs opacity-60">{t('ui.open') || 'Open'}</span>
                    </div>
                  </button>
                ))}
              </div>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-container">
                <div className="inline-block min-w-[56rem] align-top">
                  <Table className={(density === 'compact' ? 'table-compact ' : '') + ' w-full'}>
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
                            <span className="text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
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
                            <span className="text-xs text-gray-500 dark:text-[rgb(var(--muted))]">
                              {orderBy === 'status' ? (orderDir === 'asc' ? '▲' : '▼') : ''}
                            </span>
                          </button>
                        </TH>
                      </TR>
                    </THead>
                    <TBody>
                      {filteredUsers.map((u) => (
                        <TR
                          key={u.uid}
                          className="cursor-pointer"
                          onClick={() => openUserDrawer(u)}
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              openUserDrawer(u);
                            }
                          }}
                        >
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
                          <TD className="break-anywhere">{u.email || '-'}</TD>
                          <TD>{renderRoleBadge(u.role)}</TD>
                          <TD>{renderStatusBadge(u.status)}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
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
                      <span className="text-gray-500 dark:text-[rgb(var(--muted))]">Email:</span>{' '}
                      <span>{selectedUser.email || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-[rgb(var(--muted))]">
                        {t('ui.role')}:
                      </span>
                      {renderRoleBadge(selectedUser.role)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 dark:text-[rgb(var(--muted))]">
                        {t('ui.status')}:
                      </span>
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
                <div className="text-sm text-gray-700 dark:text-[rgb(var(--fg))]">
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
                  <option value="">{t('ui.all')}</option>
                  <option value="pending">{t('ui.pending')}</option>
                  <option value="approved">{t('ui.approved')}</option>
                  <option value="rejected">{t('ui.rejected')}</option>
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
                    {t('ui.reject')}
                  </Button>
                </div>
              </div>
              {tasks.length === 0 && !loading ? (
                <div className="rounded-lg border-2 border-dashed border-muted/30 bg-surface/30 p-8 text-center">
                  <h2 className="text-base font-semibold text-fg mb-1">
                    {t('overview.noTasks', { defaultValue: 'No tasks found' })}
                  </h2>
                  <p className="text-sm text-muted">
                    {taskFilter
                      ? t('overview.tryDifferentFilter', {
                          defaultValue: 'Try a different filter to see tasks.',
                        })
                      : t('overview.tasksAppearHere', {
                          defaultValue: 'Resident tasks will appear here for review.',
                        })}
                  </p>
                </div>
              ) : (
                <>
                  {/* Mobile cards */}
                  <div className="md:hidden grid grid-cols-1 gap-2">
                    {tasks.map((t) => (
                      <div key={t.id} className="card-levitate p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{t.userId}</div>
                            <div className="text-xs opacity-70 truncate">{t.rotationId} · {t.itemId}</div>
                          </div>
                          <div className="text-xs opacity-80">{t.status}</div>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs opacity-80">
                          <div>
                            {t.count}/{t.requiredCount}
                          </div>
                          <label className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!taskSel[t.id]}
                              onChange={(e) => setTaskSel((s) => ({ ...s, [t.id]: e.target.checked }))}
                            />
                            <span>{t('ui.select') || 'Select'}</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-container">
                    <div className="inline-block min-w-[56rem] align-top">
                      <Table className="w-full">
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
                            <TH>{t('ui.user')}</TH>
                            <TH>{t('ui.rotation')}</TH>
                            <TH>{t('ui.item')}</TH>
                            <TH>{t('ui.count')}</TH>
                            <TH>{t('ui.required')}</TH>
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
                  </div>
                </>
              )}
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
                <Suspense fallback={<SpinnerSkeleton />}>
                  <div className="space-y-3">
                    {/* Rotation Editor Header */}
                    <div className="card-levitate p-6 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 border-l-4 border-teal-500">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1">
                            <span className="text-3xl">📚</span>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {openRotationName || 'Loading...'}
                            </h2>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-[rgb(var(--muted))] ml-12">
                            Editing curriculum structure and requirements
                          </p>
                        </div>
                        <button
                          className="btn-levitate px-4 py-2 text-sm font-medium hover:scale-105 transition-transform"
                          onClick={() => {
                            console.log('🔙 Back button clicked - closing editor');
                            setOpenRotationId(null);
                          }}
                        >
                          ← Back to Rotations
                        </button>
                      </div>
                    </div>

                    <RotationOwnersEditor rotationId={openRotationId} />
                    <RotationTree rotationId={openRotationId} />
                  </div>
                </Suspense>
              ) : (
                <Suspense fallback={<SpinnerSkeleton />}>
                  {/* Rotations list view */}
                  <RotationsPanel onOpenEditor={setOpenRotationId} />
                </Suspense>
              )}
            </div>
          ) : tab === 'reflections' ? (
            <Suspense fallback={<SpinnerSkeleton />}>
              <div className="space-y-3">
                <AdminReflectionsTabs />
              </div>
            </Suspense>
          ) : (
            <Suspense fallback={<SpinnerSkeleton />}>
              <div className="space-y-3">
                <SettingsPanel />
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function OverviewTab() {
  const { assignments } = useActiveAssignments();
  const { residents, tutors } = useUsersByRole();
  const { rotations } = useActiveRotations();

  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }
    >
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
    </Suspense>
  );
}
