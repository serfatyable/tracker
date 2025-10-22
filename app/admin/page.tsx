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
        <div className="w-full space-y-6">
          {/* 1) Overview */}
            <div className="space-y-4">
              <div className="card-levitate p-4">
                <Suspense fallback={<SpinnerSkeleton />}>
                  <PetitionsTable />
                </Suspense>
              </div>
              <OverviewTab />
              </div>

          {/* 4) Morning Meetings snapshot (CTA to full page) */}
          <div className="card-levitate p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}</div>
              <Button asChild variant="outline"><a href="/morning-meetings">{t('ui.open')}</a></Button>
            </div>
            <div className="mt-2 text-sm opacity-80">{t('overview.next7', { defaultValue: 'Snapshot of today and this month' })}</div>
                    </div>

          {/* 5) On-Call snapshot (CTA to full page) */}
          <div className="card-levitate p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{t('ui.onCall', { defaultValue: 'On Call' })}</div>
              <Button asChild variant="outline"><a href="/on-call">{t('ui.open')}</a></Button>
            </div>
            <div className="mt-2 text-sm opacity-80">{t('overview.todaysTeam', { defaultValue: "Today's team snapshot" })}</div>
              </div>
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
