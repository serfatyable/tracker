'use client';

import {
  UserGroupIcon,
  ArrowPathIcon,
  ClipboardDocumentCheckIcon,
  CalendarDaysIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

type QuickAccessItem = {
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  subtitle: string;
  badge?: number;
  color: string;
  bgColor: string;
};

type Props = {
  usersCount?: number;
  rotationsCount?: number;
  pendingTasksCount?: number;
  upcomingMeetingsCount?: number;
  onCallToday?: string;
  reflectionsCount?: number;
};

export default function QuickAccessGrid({
  usersCount,
  rotationsCount,
  pendingTasksCount,
  upcomingMeetingsCount,
  onCallToday,
  reflectionsCount,
}: Props): React.ReactElement {
  const { t } = useTranslation();

  const items: QuickAccessItem[] = [
    {
      href: '/admin/users',
      icon: UserGroupIcon,
      label: t('ui.users', { defaultValue: 'Users' }),
      subtitle: usersCount
        ? t('dashboard.totalUsers', { count: usersCount, defaultValue: `${usersCount} total` })
        : t('dashboard.manageUsers', { defaultValue: 'Manage users' }),
      badge: usersCount,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      href: '/admin/rotations',
      icon: ArrowPathIcon,
      label: t('ui.rotations', { defaultValue: 'Rotations' }),
      subtitle: rotationsCount
        ? t('dashboard.totalRotations', {
            count: rotationsCount,
            defaultValue: `${rotationsCount} active`,
          })
        : t('dashboard.manageRotations', { defaultValue: 'Manage rotations' }),
      badge: rotationsCount,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      href: '/admin/tasks',
      icon: ClipboardDocumentCheckIcon,
      label: t('ui.tasks', { defaultValue: 'Tasks' }),
      subtitle: pendingTasksCount
        ? t('dashboard.pendingApprovals', {
            count: pendingTasksCount,
            defaultValue: `${pendingTasksCount} pending`,
          })
        : t('dashboard.reviewTasks', { defaultValue: 'Review tasks' }),
      badge: pendingTasksCount,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      href: '/admin/morning-meetings',
      icon: CalendarDaysIcon,
      label: t('ui.morningMeetings', { defaultValue: 'Morning Meetings' }),
      subtitle: upcomingMeetingsCount
        ? t('dashboard.upcomingScheduled', {
            count: upcomingMeetingsCount,
            defaultValue: `${upcomingMeetingsCount} upcoming`,
          })
        : t('dashboard.manageSchedule', { defaultValue: 'Manage schedule' }),
      badge: upcomingMeetingsCount,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      href: '/admin/on-call',
      icon: ClockIcon,
      label: t('ui.onCall', { defaultValue: 'On Call' }),
      subtitle: onCallToday || t('dashboard.viewSchedule', { defaultValue: 'View schedule' }),
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      href: '/admin/reflections',
      icon: DocumentTextIcon,
      label: t('ui.reflections', { defaultValue: 'Reflections' }),
      subtitle: reflectionsCount
        ? t('dashboard.totalReflections', {
            count: reflectionsCount,
            defaultValue: `${reflectionsCount} total`,
          })
        : t('dashboard.viewReflections', { defaultValue: 'View reflections' }),
      badge: reflectionsCount,
      color: 'text-teal-600 dark:text-teal-400',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">
          {t('dashboard.quickAccess', { defaultValue: 'Quick Access' })}
        </h2>
        <p className="text-sm text-foreground/60 mt-1">
          {t('dashboard.quickAccessDesc', {
            defaultValue: 'Jump to key admin functions',
          })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group card-levitate p-5 transition-all duration-200 hover:shadow-lg"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.bgColor}`}
              >
                <item.icon className={`h-6 w-6 ${item.color}`} aria-hidden />
              </div>
              {item.badge != null && item.badge > 0 && (
                <div className="px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs font-bold min-w-[24px] text-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                {item.label}
              </h3>
              <p className="text-sm text-foreground/60 line-clamp-1">{item.subtitle}</p>
            </div>

            {/* Arrow icon on hover */}
            <div className="mt-3 flex items-center text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
              <span>{t('dashboard.open', { defaultValue: 'Open' })}</span>
              <svg className="h-3 w-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
