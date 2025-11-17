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

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { haptic } from '../../lib/utils/haptics';

export default function BottomBar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const { data: me } = useCurrentUserProfile();
  const role = me?.role || 'resident';

  const dispatchOpenDrawer = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tracker:open-drawer'));
    }
  };

  const residentTabs = [
    {
      key: 'home',
      href: '/resident',
      label: t('ui.home', { defaultValue: 'Home' }),
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

  const tutorTabs = [
    { key: 'home', href: '/tutor', label: t('ui.home', { defaultValue: 'Home' }), Icon: HomeSolid },
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

  const adminTabs = [
    { key: 'home', href: '/admin', label: t('ui.home', { defaultValue: 'Home' }), Icon: HomeSolid },
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
  const tabs = isResident ? residentTabs : isTutor ? tutorTabs : adminTabs;
  const showMore = !isResident; // Tutors/Admins: include More

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around border-t border-black/10 dark:border-white/10 bg-white/90 dark:bg-neutral-900/90 backdrop-blur supports-[backdrop-filter]:backdrop-blur text-foreground/70 dark:text-white/70 px-1 py-1.5 md:hidden safe-area-inset-bottom"
      aria-label={t('ui.primaryNavigation', { defaultValue: 'Primary navigation' })}
      role="tablist"
    >
      {tabs.map(({ href, label, Icon }) => {
        const base = href.split('?')[0]!;
        const active = pathname === href || pathname.startsWith(base + '/');
        return (
          <Link
            key={href}
            href={href}
            role="tab"
            aria-selected={active}
            aria-label={label}
            onClick={() => haptic('light')}
            className={`flex flex-col items-center justify-center h-14 min-w-0 px-3 text-xs font-medium transition-transform transition-colors ${
              active
                ? 'text-foreground dark:text-white scale-95'
                : 'text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white active:scale-95'
            }`}
            data-active={active}
          >
            <Icon className="h-5 w-5" stroke="currentColor" />
            <span className="truncate w-full text-center">{label}</span>
          </Link>
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
          className="flex flex-col items-center justify-center h-14 min-w-0 px-3 text-xs font-medium transition-transform transition-colors text-foreground/70 dark:text-white/70 hover:text-foreground dark:hover:text-white active:scale-95"
        >
          <MoreSolid className="h-5 w-5" stroke="currentColor" />
          <span className="truncate w-full text-center">
            {t('ui.more', { defaultValue: 'More' })}
          </span>
        </button>
      )}
    </nav>
  );
}
