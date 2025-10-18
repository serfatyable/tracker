'use client';
import {
  HomeIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  BookOpenIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';

import NavItem from './NavItem';

export default function Sidebar() {
  const { data: me } = useCurrentUserProfile();
  const { t } = useTranslation();

  const role = me?.role || 'resident';
  const homeHref = role === 'admin' ? '/admin' : role === 'tutor' ? '/tutor' : '/resident';
  const reflectionsHref =
    role === 'admin'
      ? '/admin/reflections'
      : role === 'tutor'
        ? '/tutor/reflections'
        : '/resident/reflections';

  return (
    <aside
      className="hidden w-64 flex-shrink-0 border-r border-muted/20 bg-surface p-4 md:block"
      role="navigation"
      aria-label="Sidebar navigation"
    >
      <nav className="space-y-1" aria-label="Main navigation">
        <NavItem href={homeHref} label={t('ui.dashboard')} Icon={HomeIcon} />
        <NavItem href={reflectionsHref} label={t('ui.reflections')} Icon={BookOpenIcon} />
        <NavItem href="/auth" label={t('ui.auth')} Icon={UserGroupIcon} />
        <NavItem
          href="/morning-meetings"
          label={t('ui.morningMeetings')}
          Icon={CalendarDaysIcon}
        />
        <NavItem
          href="/on-call"
          label={t('ui.onCall')}
          Icon={CalendarDaysIcon}
        />
        <NavItem href="/settings" label={t('ui.settings')} Icon={Cog6ToothIcon} />
      </nav>
    </aside>
  );
}
