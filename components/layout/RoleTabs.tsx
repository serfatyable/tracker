'use client';

import {
  AcademicCapIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  Cog6ToothIcon,
  HomeIcon,
  MagnifyingGlassCircleIcon,
  UsersIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { ReadonlyURLSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { useUserTasks } from '@/lib/react-query/hooks';

type Tab = {
  id: string;
  label: string;
  href: string;
  icon: typeof HomeIcon;
  badge?: number | null;
  match: (pathname: string, params: ReadonlyURLSearchParams | null) => boolean;
};

function useResidentTabs(): Tab[] {
  const { t } = useTranslation();
  const { tasks } = useUserTasks();
  const pendingTasks = useMemo(
    () => tasks.filter((task) => task.status === 'pending').length,
    [tasks],
  );

  return [
    {
      id: 'resident-home',
      label: t('ui.home', { defaultValue: 'Home' }) as string,
      href: '/resident',
      icon: HomeIcon,
      match: (pathname, params) =>
        pathname.startsWith('/resident') &&
        (params?.get('tab') === null || params?.get('tab') === '' || params?.get('tab') === 'home'),
    },
    {
      id: 'resident-reflections',
      label: t('ui.reflections', { defaultValue: 'Reflections' }) as string,
      href: '/resident/reflections',
      icon: BookOpenIcon,
      match: (pathname) => pathname.startsWith('/resident/reflections'),
    },
    {
      id: 'resident-rotations',
      label: t('ui.rotations', { defaultValue: 'Rotations' }) as string,
      href: '/resident/rotations',
      icon: ClipboardDocumentListIcon,
      match: (pathname) => pathname.startsWith('/resident/rotations'),
    },
    {
      id: 'resident-exams',
      label: t('exams.title', { defaultValue: 'Exams' }) as string,
      href: '/exams',
      icon: AcademicCapIcon,
      match: (pathname) => pathname.startsWith('/exams'),
    },
    {
      id: 'resident-on-call',
      label: t('ui.onCall', { defaultValue: 'On Call' }) as string,
      href: '/on-call',
      icon: ClipboardDocumentCheckIcon,
      match: (pathname) => pathname.startsWith('/on-call'),
    },
    {
      id: 'resident-meetings',
      label: t('ui.morningMeetings', { defaultValue: 'Meetings' }) as string,
      href: '/morning-meetings',
      icon: UsersIcon,
      match: (pathname) => pathname.startsWith('/morning-meetings'),
    },
    {
      id: 'resident-settings',
      label: t('ui.settings', { defaultValue: 'Settings' }) as string,
      href: '/settings',
      icon: Cog6ToothIcon,
      match: (pathname) => pathname.startsWith('/settings'),
    },
  ];
}

function useTutorTabs(): Tab[] {
  const { t } = useTranslation();

  return [
    {
      id: 'tutor-home',
      label: t('ui.home', { defaultValue: 'Home' }) as string,
      href: '/tutor',
      icon: HomeIcon,
      match: (pathname) => pathname === '/tutor',
    },
    {
      id: 'tutor-residents',
      label: t('tutor.tabs.residents', { defaultValue: 'Residents' }) as string,
      href: '/tutor/residents',
      icon: UsersIcon,
      match: (pathname) => pathname.startsWith('/tutor/residents'),
    },
    {
      id: 'tutor-tasks',
      label: t('ui.tasks', { defaultValue: 'Tasks' }) as string,
      href: '/tutor/tasks',
      icon: ClipboardDocumentListIcon,
      match: (pathname) => pathname.startsWith('/tutor/tasks'),
    },
    {
      id: 'tutor-reflections',
      label: t('ui.reflections', { defaultValue: 'Reflections' }) as string,
      href: '/tutor/reflections',
      icon: BookOpenIcon,
      match: (pathname) => pathname.startsWith('/tutor/reflections'),
    },
    {
      id: 'tutor-rotations',
      label: t('ui.rotations', { defaultValue: 'Rotations' }) as string,
      href: '/tutor/rotations',
      icon: ClipboardDocumentListIcon,
      match: (pathname) => pathname.startsWith('/tutor/rotations'),
    },
    {
      id: 'tutor-on-call',
      label: t('ui.onCall', { defaultValue: 'On Call' }) as string,
      href: '/on-call',
      icon: ClipboardDocumentCheckIcon,
      match: (pathname) => pathname.startsWith('/on-call'),
    },
    {
      id: 'tutor-meetings',
      label: t('ui.morningMeetings', { defaultValue: 'Meetings' }) as string,
      href: '/morning-meetings',
      icon: UsersIcon,
      match: (pathname) => pathname.startsWith('/morning-meetings'),
    },
    {
      id: 'tutor-exams',
      label: t('exams.title', { defaultValue: 'Exams' }) as string,
      href: '/exams',
      icon: AcademicCapIcon,
      match: (pathname) => pathname.startsWith('/exams'),
    },
    {
      id: 'tutor-settings',
      label: t('ui.settings', { defaultValue: 'Settings' }) as string,
      href: '/settings',
      icon: Cog6ToothIcon,
      match: (pathname) => pathname.startsWith('/settings'),
    },
  ];
}

function useAdminTabs(): Tab[] {
  const { t } = useTranslation();
  return [
    {
      id: 'admin-home',
      label: t('ui.home', { defaultValue: 'Home' }) as string,
      href: '/admin',
      icon: HomeIcon,
      match: (pathname) => pathname === '/admin',
    },
    {
      id: 'admin-tasks',
      label: t('ui.tasks', { defaultValue: 'Tasks' }) as string,
      href: '/admin/tasks',
      icon: ClipboardDocumentListIcon,
      match: (pathname) => pathname.startsWith('/admin/tasks'),
    },
    {
      id: 'admin-reflections',
      label: t('ui.reflections', { defaultValue: 'Reflections' }) as string,
      href: '/admin/reflections',
      icon: BookOpenIcon,
      match: (pathname) => pathname.startsWith('/admin/reflections'),
    },
    {
      id: 'admin-rotations',
      label: t('ui.rotations', { defaultValue: 'Rotations' }) as string,
      href: '/admin/rotations',
      icon: ClipboardDocumentCheckIcon,
      match: (pathname) => pathname.startsWith('/admin/rotations'),
    },
    {
      id: 'admin-on-call',
      label: t('ui.onCall', { defaultValue: 'On Call' }) as string,
      href: '/on-call',
      icon: ClipboardDocumentCheckIcon,
      match: (pathname) => pathname.startsWith('/on-call'),
    },
    {
      id: 'admin-meetings',
      label: t('ui.morningMeetings', { defaultValue: 'Meetings' }) as string,
      href: '/admin/morning-meetings',
      icon: UsersIcon,
      match: (pathname) => pathname.startsWith('/admin/morning-meetings'),
    },
    {
      id: 'admin-exams',
      label: t('exams.title', { defaultValue: 'Exams' }) as string,
      href: '/exams',
      icon: AcademicCapIcon,
      match: (pathname) => pathname.startsWith('/exams'),
    },
    {
      id: 'admin-users',
      label: t('ui.userManagement', { defaultValue: 'User Management' }) as string,
      href: '/admin/users',
      icon: UsersIcon,
      match: (pathname) => pathname.startsWith('/admin/users'),
    },
    {
      id: 'admin-settings',
      label: t('ui.settings', { defaultValue: 'Settings' }) as string,
      href: '/settings',
      icon: Cog6ToothIcon,
      match: (pathname) => pathname.startsWith('/settings'),
    },
  ];
}

// Default tabs for new users: On Call, Morning Meetings, Rotations
const DEFAULT_TABS = {
  resident: ['resident-on-call', 'resident-meetings', 'resident-rotations'],
  tutor: ['tutor-on-call', 'tutor-meetings', 'tutor-rotations'],
  admin: ['admin-on-call', 'admin-meetings', 'admin-rotations'],
};

export default function RoleTabs() {
  const { data: me } = useCurrentUserProfile();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const role = me?.role || 'resident';

  const residentTabs = useResidentTabs();
  const tutorTabs = useTutorTabs();
  const adminTabs = useAdminTabs();

  const baseTabs = role === 'admin' ? adminTabs : role === 'tutor' ? tutorTabs : residentTabs;

  const tabs = useMemo(() => {
    const allTabs = [
      ...baseTabs,
      {
        id: 'global-search',
        label: t('ui.search', { defaultValue: 'Search' }) as string,
        href: '/search',
        icon: MagnifyingGlassCircleIcon,
        match: (path: string) => path.startsWith('/search'),
      },
    ];

    // Filter tabs based on user preferences
    const quickAccessTabs = me?.settings?.quickAccessTabs;

    // If no preference set, use default tabs for new users
    if (!quickAccessTabs) {
      const defaultTabIds = DEFAULT_TABS[role];
      return allTabs.filter((tab) => defaultTabIds.includes(tab.id));
    }

    // If user has empty array, show no tabs (user chose to hide all)
    if (quickAccessTabs.length === 0) {
      return [];
    }

    // Filter tabs based on user's selected tabs
    return allTabs.filter((tab) => quickAccessTabs.includes(tab.id));
  }, [baseTabs, t, me?.settings?.quickAccessTabs, role]);

  return (
    <nav
      className="segmented-nav hidden md:flex"
      aria-label={t('ui.tabNavigation', { defaultValue: 'Primary navigation' }) as string}
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname, searchParams);
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={clsx('segmented-nav__item', active && 'segmented-nav__item--active')}
            aria-current={active ? 'page' : undefined}
          >
            <tab.icon className="segmented-nav__icon" />
            <span className="segmented-nav__label">{tab.label}</span>
            {typeof tab.badge === 'number' && tab.badge > 0 ? (
              <span
                className="segmented-nav__badge"
                aria-label={
                  t('ui.pendingCount', {
                    count: tab.badge,
                    defaultValue: '{{count}} pending',
                  }) as string
                }
              >
                {tab.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
