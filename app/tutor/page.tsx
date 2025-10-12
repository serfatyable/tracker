'use client';
import { useState } from 'react';
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
import {
  approveRotationPetition,
  denyRotationPetition,
  assignTutorToResident,
  unassignTutorFromResident,
  updateTasksStatus,
} from '../../lib/firebase/admin';

export default function TutorDashboard() {
  const [tab, setTab] = useState<
    'dashboard' | 'residents' | 'tasks' | 'rotations' | 'reflections' | 'settings'
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
