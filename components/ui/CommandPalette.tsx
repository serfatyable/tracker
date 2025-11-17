'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { createSynonymMatcher } from '../../lib/search/synonyms';

export default function CommandPalette() {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: me } = useCurrentUserProfile();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      if (
        (isMac && e.metaKey && e.key.toLowerCase() === 'k') ||
        (!isMac && e.ctrlKey && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (open && e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('tracker:command-palette', onOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('tracker:command-palette', onOpen as EventListener);
    };
  }, [open]);

  const role = me?.role || 'resident';
  const items = useMemo(() => {
    if (role === 'resident') {
      return [
        { label: t('ui.home') as string, href: '/resident' },
        { label: t('ui.onCall', { defaultValue: 'On Call' }) as string, href: '/on-call' },
        {
          label: t('ui.morningMeetings', { defaultValue: 'Morning Meetings' }) as string,
          href: '/morning-meetings',
        },
        { label: t('ui.search') as string, href: '/search' },
        { label: t('ui.settings') as string, href: '/settings' },
      ];
    }
    if (role === 'tutor') {
      return [
        { label: t('ui.home') as string, href: '/tutor' },
        { label: t('tutor.tabs.residents') as string, href: '/tutor?tab=residents' },
        { label: t('ui.tasks') as string, href: '/tutor?tab=tasks' },
        { label: t('ui.onCall', { defaultValue: 'On Call' }) as string, href: '/on-call' },
        {
          label: t('ui.morningMeetings', { defaultValue: 'Morning Meetings' }) as string,
          href: '/morning-meetings',
        },
        { label: t('ui.settings') as string, href: '/settings' },
      ];
    }
    return [
      { label: t('ui.home') as string, href: '/admin' },
      { label: t('ui.tasks') as string, href: '/admin?tab=tasks' },
      {
        label: t('ui.morningMeetings', { defaultValue: 'Morning Meetings' }) as string,
        href: '/morning-meetings',
      },
      { label: t('ui.users', { defaultValue: 'Users' }) as string, href: '/admin?tab=users' },
      { label: t('ui.rotations') as string, href: '/admin?tab=rotations' },
      { label: t('ui.settings') as string, href: '/settings' },
    ];
  }, [role, t]);

  const matcher = useMemo(() => createSynonymMatcher(q), [q]);
  const filtered = useMemo(() => items.filter((it) => matcher(it.label)), [items, matcher]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120]">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="absolute inset-x-0 top-10 mx-auto w-full max-w-md rounded-lg bg-bg text-fg shadow-elev2 p-3">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('ui.search', { defaultValue: 'Search' }) as string}
          className="w-full border rounded px-3 py-2 mb-2"
        />
        <div className="max-h-80 overflow-auto">
          {filtered.map((it) => (
            <button
              key={it.href}
              className="w-full text-left px-2 py-2 rounded hover:bg-surface/60"
              onClick={() => {
                setOpen(false);
                router.push(it.href);
              }}
            >
              {it.label}
            </button>
          ))}
          {filtered.length === 0 ? (
            <div className="px-2 py-4 text-sm opacity-70">{t('ui.noResults')}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
