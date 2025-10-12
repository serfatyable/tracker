"use client";
import { HomeIcon, Cog6ToothIcon, UserGroupIcon, BookOpenIcon, CalendarDaysIcon } from '@heroicons/react/24/outline';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useTranslation } from 'react-i18next';

import NavItem from './NavItem';

export default function Sidebar() {
    const { data: me } = useCurrentUserProfile();
    const { t } = useTranslation();

    const role = me?.role || 'resident';
    const homeHref = role === 'admin' ? '/admin' : role === 'tutor' ? '/tutor' : '/resident';
    const reflectionsHref = role === 'admin' ? '/admin/reflections' : role === 'tutor' ? '/tutor/reflections' : '/resident/reflections';

    return (
        <aside className="hidden w-64 flex-shrink-0 border-r bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:block">
            <nav className="space-y-1">
                <NavItem href={homeHref} label="Dashboard" Icon={HomeIcon} />
                <NavItem href={reflectionsHref} label="Reflections" Icon={BookOpenIcon} />
                <NavItem href="/auth" label="Auth" Icon={UserGroupIcon} />
                <NavItem
                    href="/morning-meetings"
                    label={t('ui.morningMeetings', { defaultValue: 'Morning Meetings' })}
                    Icon={CalendarDaysIcon}
                />
                <NavItem
                    href="/on-call"
                    label={t('ui.onCall', { defaultValue: 'On Call' })}
                    Icon={CalendarDaysIcon}
                />
                <NavItem href="/settings" label="Settings" Icon={Cog6ToothIcon} />
            </nav>
        </aside>
    );
}
