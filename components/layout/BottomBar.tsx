'use client';
import {
  HomeIcon as HomeSolid,
  CalendarDaysIcon as CalendarSolid,
  ChatBubbleLeftRightIcon as ChatSolid,
  MagnifyingGlassIcon as SearchSolid,
  Bars3Icon as MoreSolid,
  UserGroupIcon as ResidentsSolid,
  ClipboardDocumentCheckIcon as TasksSolid,
  DocumentTextIcon as DocumentSolid,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile, useUserTasks } from '@/lib/react-query/hooks';
import { haptic } from '@/lib/utils/haptics';

type TabDefinition = {
  key: string;
  href?: string;
  label: string;
  Icon: typeof HomeSolid;
  badge?: number | null;
  onPress?: () => void;
};

export default function BottomBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const role = me?.role || 'resident';
  const { tasks } = useUserTasks();

  const dispatchOpenDrawer = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tracker:open-drawer'));
    }
  };

  const pendingCount = tasks.filter((task) => task.status === 'pending').length;

  const residentTabs: TabDefinition[] = [
    {
      key: 'home',
      href: '/resident',
      label: t('ui.homeTitle', { defaultValue: 'Home' }),
      Icon: HomeSolid,
    },
    {
      key: 'exams',
      href: '/exams',
      label: t('exams.title', { defaultValue: 'Exams' }),
      Icon: DocumentSolid,
    },
    {
      key: 'oncall',
      href: '/on-call',
      label: t('ui.onCall', { defaultValue: 'On Call' }),
      Icon: CalendarSolid,
    },
    {
      key: 'meetings',
      href: '/morning-meetings',
      label: t('ui.morningMeetings', { defaultValue: 'Meetings' }),
      Icon: ChatSolid,
    },
    {
      key: 'search',
      href: '/search',
      label: t('ui.search', { defaultValue: 'Search' }),
      Icon: SearchSolid,
    },
  ];

  const tutorTabs: TabDefinition[] = [
    {
      key: 'home',
      href: '/tutor',
      label: t('ui.homeTitle', { defaultValue: 'Home' }),
      Icon: HomeSolid,
    },
    {
      key: 'exams',
      href: '/exams',
      label: t('exams.title', { defaultValue: 'Exams' }),
      Icon: DocumentSolid,
    },
    {
      key: 'residents',
      href: '/tutor/residents',
      label: t('tutor.tabs.residents', { defaultValue: 'Residents' }) as string,
      Icon: ResidentsSolid,
    },
    { key: 'tasks', href: '/tutor/tasks', label: t('ui.tasks'), Icon: TasksSolid },
    // More is a trigger instead of Link
  ];

  const adminTabs: TabDefinition[] = [
    {
      key: 'home',
      href: '/admin',
      label: t('ui.homeTitle', { defaultValue: 'Home' }),
      Icon: HomeSolid,
    },
    {
      key: 'exams',
      href: '/exams',
      label: t('exams.title', { defaultValue: 'Exams' }),
      Icon: DocumentSolid,
    },
    { key: 'tasks', href: '/admin/tasks', label: t('ui.tasks'), Icon: TasksSolid },
    // More is a trigger instead of Link
  ];

  const isResident = role === 'resident';
  const isTutor = role === 'tutor';
  if (isResident) {
    residentTabs[0]!.badge = pendingCount || null;
  }

  const tabs = isResident ? residentTabs : isTutor ? tutorTabs : adminTabs;
  const showMore = true;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-[rgb(var(--border))] bg-[rgb(var(--bg))]/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur text-[rgb(var(--fg))]/70 px-1 py-1.5 md:hidden safe-area-inset-bottom"
      aria-label={t('ui.primaryNavigation', { defaultValue: 'Primary navigation' })}
      role="tablist"
    >
      {tabs.map(({ href, label, Icon, badge, onPress, key }) => {
        const base = href?.split('?')[0]!;
        const active = href ? pathname === href || pathname.startsWith(base + '/') : false;
        const Component = (href ? Link : 'button') as any;
        return (
          <Component
            key={key}
            {...(href ? { href } : { type: 'button' })}
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => {
              haptic('light');
              if (onPress) onPress();
            }}
            className={`nav-pill ${
              active
                ? 'text-foreground dark:text-white scale-95'
                : 'text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white active:scale-95'
            }`}
            title={label}
          >
            <span className="relative flex flex-col items-center gap-1">
              <Icon className="h-5 w-5" stroke="currentColor" aria-hidden="true" />
              <span className="truncate text-sm leading-tight">{label}</span>
              {badge ? (
                <span
                  className="nav-badge"
                  aria-label={`${label} has ${badge} updates`}
                  aria-live="polite"
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              ) : null}
            </span>
          </Component>
        );
      })}
      {showMore && (
        <button
          type="button"
          role="tab"
          aria-label={t('ui.menu', { defaultValue: 'Menu' })}
          onClick={() => {
            haptic('light');
            dispatchOpenDrawer();
          }}
          className="nav-pill text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white active:scale-95"
        >
          <MoreSolid className="h-5 w-5" stroke="currentColor" />
          <span className="truncate w-full text-center text-sm">
            {t('ui.more', { defaultValue: 'More' })}
          </span>
        </button>
      )}
    </nav>
  );
}
