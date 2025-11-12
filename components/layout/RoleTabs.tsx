'use client';

import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
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

import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useUserTasks } from '../../lib/hooks/useUserTasks';

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
      id: 'resident-progress',
      label: t('resident.progress', { defaultValue: 'Progress' }) as string,
      href: '/resident?tab=progress',
      icon: AcademicCapIcon,
      match: (pathname, params) =>
        pathname.startsWith('/resident') && params?.get('tab') === 'progress',
      badge: pendingTasks > 0 ? pendingTasks : null,
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
      id: 'tutor-on-call',
      label: t('ui.onCall', { defaultValue: 'On Call' }) as string,
      href: '/on-call',
      icon: ClipboardDocumentCheckIcon,
      match: (pathname) => pathname.startsWith('/on-call'),
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
      id: 'admin-meetings',
      label: t('ui.morningMeetings', { defaultValue: 'Meetings' }) as string,
      href: '/admin/morning-meetings',
      icon: UsersIcon,
      match: (pathname) => pathname.startsWith('/admin/morning-meetings'),
    },
    {
      id: 'admin-rotations',
      label: t('ui.rotations', { defaultValue: 'Rotations' }) as string,
      href: '/admin/rotations',
      icon: ClipboardDocumentCheckIcon,
      match: (pathname) => pathname.startsWith('/admin/rotations'),
    },
  ];
}

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
    return [
      ...baseTabs,
      {
        id: 'global-search',
        label: t('ui.search', { defaultValue: 'Search' }) as string,
        href: '/search',
        icon: MagnifyingGlassCircleIcon,
        match: (path: string) => path.startsWith('/search'),
      },
    ];
  }, [baseTabs, t]);

  return (
    <nav
      className="segmented-nav"
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
