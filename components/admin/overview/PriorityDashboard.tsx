'use client';

import {
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  ClockIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import type { Assignment } from '../../../types/assignments';
import type { UserProfile } from '../../../types/auth';

type Props = {
  pendingPetitionsCount: number;
  pendingUsersCount: number;
  unassignedResidentsCount: number;
  activeAssignmentsCount: number;
  tutorLoadBalance: number;
  rotationCoverage: number;
  upcomingMeetingsCount: number;
  recentActivityCount: number;
  onExpandPetitions?: () => void;
};

export default function PriorityDashboard({
  pendingPetitionsCount,
  pendingUsersCount,
  unassignedResidentsCount,
  activeAssignmentsCount,
  tutorLoadBalance,
  rotationCoverage,
  upcomingMeetingsCount,
  recentActivityCount,
  onExpandPetitions,
}: Props): React.ReactElement {
  const { t } = useTranslation();

  const hasUrgentActions =
    pendingPetitionsCount > 0 || pendingUsersCount > 0 || unassignedResidentsCount > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Column 1: Action Required */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <ExclamationTriangleIcon
            className={`h-5 w-5 ${hasUrgentActions ? 'text-amber-600' : 'text-gray-400'}`}
          />
          <h2 className="text-lg font-semibold text-foreground">
            {t('dashboard.actionRequired', { defaultValue: 'Action Required' })}
          </h2>
        </div>

        {/* Pending Petitions */}
        <button
          onClick={onExpandPetitions}
          className="w-full text-left card-levitate p-4 border-l-4 border-amber-500 hover:border-amber-600 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <ExclamationTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground/80">
                  {t('dashboard.pendingPetitions', { defaultValue: 'Pending Petitions' })}
                </div>
                <div className="text-2xl font-bold text-foreground">{pendingPetitionsCount}</div>
              </div>
            </div>
            {pendingPetitionsCount > 0 && (
              <div className="px-2 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs font-medium">
                {t('dashboard.review', { defaultValue: 'Review' })}
              </div>
            )}
          </div>
        </button>

        {/* Pending User Registrations */}
        <Link
          href="/admin/users"
          className="block w-full card-levitate p-4 border-l-4 border-red-500 hover:border-red-600 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                <UserPlusIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground/80">
                  {t('dashboard.pendingUsers', { defaultValue: 'Pending Users' })}
                </div>
                <div className="text-2xl font-bold text-foreground">{pendingUsersCount}</div>
              </div>
            </div>
            {pendingUsersCount > 0 && (
              <div className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-medium">
                {t('dashboard.approve', { defaultValue: 'Approve' })}
              </div>
            )}
          </div>
        </Link>

        {/* Unassigned Residents */}
        <div className="card-levitate p-4 border-l-4 border-blue-500">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
              <UserGroupIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground/80">
                {t('dashboard.unassignedResidents', { defaultValue: 'Unassigned Residents' })}
              </div>
              <div className="text-2xl font-bold text-foreground">{unassignedResidentsCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2: System Health */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircleIcon className="h-5 w-5 text-green-600" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('dashboard.systemHealth', { defaultValue: 'System Health' })}
          </h2>
        </div>

        {/* Active Assignments */}
        <div className="card-levitate p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/40">
              <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground/80">
                {t('dashboard.activeAssignments', { defaultValue: 'Active Assignments' })}
              </div>
              <div className="text-2xl font-bold text-foreground">{activeAssignmentsCount}</div>
            </div>
            <div className="text-green-600 dark:text-green-400">
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Tutor Load Balance */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
              <ChartBarIcon className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground/80">
                {t('dashboard.tutorLoadBalance', { defaultValue: 'Tutor Load Balance' })}
              </div>
              <div className="text-2xl font-bold text-foreground">
                {tutorLoadBalance.toFixed(1)}
              </div>
            </div>
          </div>
          <div className="text-xs text-foreground/60">
            {t('dashboard.standardDeviation', { defaultValue: 'Standard deviation' })}
          </div>
        </div>

        {/* Rotation Coverage */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
              <ChartBarIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-medium text-foreground/80">
                {t('dashboard.rotationCoverage', { defaultValue: 'Rotation Coverage' })}
              </div>
              <div className="text-2xl font-bold text-foreground">{rotationCoverage}%</div>
            </div>
          </div>
          <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-500"
              style={{ width: `${rotationCoverage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Column 3: Upcoming & Recent */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDaysIcon className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-foreground">
            {t('dashboard.upcomingRecent', { defaultValue: 'Upcoming & Recent' })}
          </h2>
        </div>

        {/* Next 7 Days */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
              <CalendarDaysIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground/80">
                {t('dashboard.next7Days', { defaultValue: 'Next 7 Days' })}
              </div>
              <div className="text-2xl font-bold text-foreground">{upcomingMeetingsCount}</div>
            </div>
          </div>
          <div className="space-y-2">
            <Link
              href="/morning-meetings"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>{t('dashboard.viewMeetings', { defaultValue: 'View meetings' })}</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
            <Link
              href="/on-call"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <span>{t('dashboard.viewOnCall', { defaultValue: 'View on-call schedule' })}</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card-levitate p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/30">
              <ClockIcon className="h-5 w-5 text-teal-600 dark:text-teal-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground/80">
                {t('dashboard.recentActivity', { defaultValue: 'Recent Activity' })}
              </div>
              <div className="text-2xl font-bold text-foreground">{recentActivityCount}</div>
            </div>
          </div>
          <div className="text-xs text-foreground/60">
            {t('dashboard.last24Hours', { defaultValue: 'Last 24 hours' })}
          </div>
        </div>

        {/* Quick Stats Summary */}
        <div className="card-levitate p-4 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20">
          <div className="text-sm font-medium text-foreground/80 mb-3">
            {t('dashboard.quickStats', { defaultValue: 'Quick Stats' })}
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-foreground/60">
                {t('dashboard.systemStatus', { defaultValue: 'System Status' })}
              </span>
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-medium">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {t('dashboard.healthy', { defaultValue: 'Healthy' })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-foreground/60">
                {t('dashboard.dataSync', { defaultValue: 'Data Sync' })}
              </span>
              <span className="text-foreground font-medium">
                {t('dashboard.realtime', { defaultValue: 'Real-time' })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
