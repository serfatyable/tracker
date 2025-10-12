'use client';
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import AuthGate from '../../components/auth/AuthGate';
import SettingsPanel from '../../components/settings/SettingsPanel';
import TopBar from '../../components/TopBar';
import PendingApprovals from '../../components/tutor/PendingApprovals';
import AssignedResidents from '../../components/tutor/AssignedResidents';
import TutorTodos from '../../components/tutor/TutorTodos';
import ResidentsTab from '../../components/tutor/tabs/ResidentsTab';
import TasksTab from '../../components/tutor/tabs/TasksTab';
import RotationsTab from '../../components/tutor/tabs/RotationsTab';
import { useTutorDashboardData } from '../../lib/hooks/useTutorDashboardData';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useReflectionsForTutor } from '../../lib/hooks/useReflections';
import TodayPanel from '../../components/on-call/TodayPanel';
import NextShiftCard from '../../components/on-call/NextShiftCard';
import TeamForDate from '../../components/on-call/TeamForDate';
import MiniCalendar from '../../components/on-call/MiniCalendar';
import { useMorningMeetingsUpcoming, useMorningMeetingsMonth } from '../../lib/hooks/useMorningClasses';
import {
  approveRotationPetition,
  denyRotationPetition,
  assignTutorToResident,
  unassignTutorFromResident,
  updateTasksStatus,
} from '../../lib/firebase/admin';

export default function TutorDashboard() {
  const pathname = usePathname();
  const [tab, setTab] = useState<
    'dashboard' | 'residents' | 'tasks' | 'rotations' | 'reflections' | 'settings' | 'morning' | 'oncall'
  >('dashboard');
  const { t } = useTranslation();
  return (
    <AuthGate requiredRole="tutor">
      <div>
        <TopBar />
        <div className="p-6">
          <div className="glass-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  className={`tab-levitate ${tab === 'dashboard' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('dashboard')}
                >
                  {t('ui.dashboard') || 'Dashboard'}
                </button>
                <button
                  className={`tab-levitate ${tab === 'residents' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('residents')}
                >
                  {t('tutor.tabs.residents') || t('roles.resident') || 'Residents'}
                </button>
                <button
                  className={`tab-levitate ${tab === 'tasks' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('tasks')}
                >
                  {t('ui.tasks') || 'Tasks'}
                </button>
                <button
                  className={`tab-levitate ${tab === 'rotations' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('rotations')}
                >
                  {t('ui.rotations') || 'Rotations'}
                </button>
                <button
                  className={`tab-levitate ${tab === 'reflections' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('reflections')}
                >
                  {t('ui.reflections') || 'Reflections'}
                </button>
                <button
                  className={`tab-levitate ${tab === 'morning' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('morning')}
                >
                  {t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}
                </button>
                <button
                  className={`tab-levitate ${tab === 'oncall' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('oncall')}
                >
                  {t('ui.onCall', { defaultValue: 'On Call' })}
                </button>
                <Link
                  href="/on-call"
                  className={`tab-levitate ${
                    pathname?.startsWith('/on-call') ? 'ring-1 ring-blue-500' : ''
                  }`}
                >
                  {t('ui.onCall', { defaultValue: 'On Call' })}
                </Link>
                <button
                  className={`tab-levitate ${tab === 'settings' ? 'ring-1 ring-blue-500' : ''}`}
                  onClick={() => setTab('settings')}
                >
                  {t('ui.settings') || 'Settings'}
                </button>
              </div>
            </div>
            {tab === 'dashboard' ? (
              <div className="space-y-3">
                <TutorDashboardSections />
              </div>
            ) : tab === 'residents' ? (
              <TutorResidentsTab />
            ) : tab === 'tasks' ? (
              <TutorTasksTab />
            ) : tab === 'rotations' ? (
              <TutorRotationsTab />
            ) : tab === 'reflections' ? (
              <TutorReflectionsInline />
            ) : tab === 'morning' ? (
              <TutorMorningMeetingsInline />
            ) : tab === 'oncall' ? (
              <TutorOnCallInline />
            ) : (
              <div className="space-y-3">
                <SettingsPanel />
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGate>
  );
}

function TutorDashboardSections() {
  const {
    me,
    assignments,
    rotations,
    residents,
    tutors,
    ownedRotationIds,
    supervisedResidents,
    petitions,
    todos,
  } = useTutorDashboardData();
  const residentIdToName = (id: string) => residents.find((r) => r.uid === id)?.fullName || id;
  const [refreshCounter, setRefreshCounter] = useState(0);
  return (
    <>
      <PendingApprovals petitions={petitions} residentIdToName={residentIdToName} />
      {me ? (
        <AssignedResidents
          meUid={me.uid}
          assignments={assignments}
          rotations={rotations}
          residents={residents}
          tutors={tutors}
          ownedRotationIds={ownedRotationIds}
        />
      ) : null}
      <TutorTodos todos={todos} onRefresh={() => setRefreshCounter((c) => c + 1)} />
    </>
  );
}

function useTabsData() {
  const data = useTutorDashboardData();
  return { data } as const;
}

function TutorResidentsTab() {
  const { data } = useTabsData();
  const actions = {
    approvePetition: async (id: string) => {
      if (!data.me) return;
      await approveRotationPetition(id, data.me.uid);
    },
    denyPetition: async (id: string) => {
      if (!data.me) return;
      await denyRotationPetition(id, data.me.uid);
    },
    selfAssign: async (residentId: string) => {
      if (!data.me) return;
      await assignTutorToResident(residentId, data.me.uid);
    },
    unassignSelf: async (residentId: string) => {
      if (!data.me) return;
      await unassignTutorFromResident(residentId, data.me.uid);
    },
  } as const;
  if (!data.me) return null;
  return (
    <div className="space-y-3">
      <ResidentsTab
        meUid={data.me.uid}
        residents={data.residents}
        assignments={data.assignments}
        rotations={data.rotations}
        petitions={data.petitions as any}
        ownedRotationIds={data.ownedRotationIds}
        onApprove={actions.approvePetition}
        onDeny={actions.denyPetition}
        onSelfAssign={actions.selfAssign}
        onUnassignSelf={actions.unassignSelf}
      />
    </div>
  );
}

function TutorTasksTab() {
  const { data } = useTabsData();
  const actions = {
    bulkApproveTasks: async (ids: string[]) => {
      if (!ids?.length) return;
      await updateTasksStatus({ taskIds: ids, status: 'approved' });
    },
    bulkRejectTasks: async (ids: string[], _reason?: string) => {
      if (!ids?.length) return;
      await updateTasksStatus({ taskIds: ids, status: 'rejected' });
    },
  } as const;
  return (
    <div className="space-y-3">
      <TasksTab
        residents={data.residents}
        tasks={data.tasks as any}
        onBulkApprove={actions.bulkApproveTasks}
        onBulkReject={actions.bulkRejectTasks}
      />
    </div>
  );
}

function TutorRotationsTab() {
  const { data } = useTabsData();
  if (!data.me) return null;
  return (
    <div className="space-y-3">
      <RotationsTab
        meUid={data.me.uid}
        rotations={data.rotations}
        assignments={data.assignments}
        residents={data.residents}
        petitions={data.petitions as any}
      />
    </div>
  );
}

function TutorReflectionsInline() {
  const { data: me } = useCurrentUserProfile();
  const { list, loading } = useReflectionsForTutor(me?.uid || null);
  return (
    <div className="space-y-3">
      <div className="glass-card p-4">
        <div className="font-semibold mb-2">Reflections I wrote</div>
        {loading ? <div className="text-sm opacity-70">Loading…</div> : null}
        <div className="space-y-2">
          {(list || []).map((r) => (
            <div
              key={r.id}
              className="border rounded p-2 text-sm flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{r.taskType}</div>
                <div className="text-xs opacity-70">{r.taskOccurrenceId}</div>
              </div>
              <div className="text-xs opacity-70">
                {(r as any).submittedAt?.toDate?.()?.toLocaleString?.() || ''}
              </div>
            </div>
          ))}
          {!loading && !list?.length ? (
            <div className="text-sm opacity-70">No reflections yet.</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TutorMorningMeetingsInline() {
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
        {(items || []).map((c) => {
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

function TutorOnCallInline() {
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
