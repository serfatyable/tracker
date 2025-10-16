'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import Card from '../../components/ui/Card';
import {
  useMorningMeetingsUpcoming,
  useMorningMeetingsMonth,
} from '../../lib/hooks/useMorningClasses';

function SectionBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-2 font-semibold">{title}</div>
      <div className="space-y-2 text-sm">{children}</div>
    </Card>
  );
}

export default function MorningMeetingsPage() {
  const { t, i18n } = useTranslation();
  const { today, tomorrow, next7 } = useMorningMeetingsUpcoming();
  const now = new Date();
  const y = now.getFullYear();
  const m0 = now.getMonth();
  const { list: monthList } = useMorningMeetingsMonth(y, m0);

  const daysInMonth = useMemo(() => new Date(y, m0 + 1, 0).getDate(), [y, m0]);
  const monthByDay = useMemo(() => {
    const map: Record<number, any[]> = {};
    (monthList || []).forEach((it: any) => {
      const d = new Date(it.date.toDate());
      const dd = d.getDate();
      map[dd] = map[dd] || [];
      map[dd].push(it);
    });
    return map;
  }, [monthList]);

  function renderList(items: any[] | null) {
    if (!items || !items.length)
      return (
        <div className="rounded-lg border-2 border-dashed border-muted/30 bg-surface/30 p-4 text-center">
          <p className="text-sm text-muted">{t('morningMeetings.noClasses')}</p>
        </div>
      );
    return (
      <ul className="divide-y rounded border">
        {items.map((c) => {
          const start =
            c.date?.toDate?.()?.toLocaleTimeString?.(i18n.language === 'he' ? 'he-IL' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }) || '07:10';
          return (
            <li key={c.id || c.dateKey + c.title} className="p-2 flex items-center justify-between">
              <div>
                <div className="font-medium">{c.title}</div>
                <div className="text-xs opacity-70">
                  {c.lecturer} — {start}
                </div>
              </div>
              {c.link ? (
                <Link
                  href={c.link}
                  className="text-blue-600 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('ui.open')}
                </Link>
              ) : null}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <h1 className="text-2xl font-semibold">{t('morningMeetings.title')}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <SectionBox title={t('morningMeetings.today')}>{renderList(today)}</SectionBox>
          <SectionBox title={t('morningMeetings.tomorrow')}>{renderList(tomorrow)}</SectionBox>
          <SectionBox title={t('morningMeetings.next7')}>{renderList(next7)}</SectionBox>
        </div>
        <Card>
          <div className="mb-2 font-semibold">{t('morningMeetings.month')}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2 text-sm">
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
              <div key={d} className="rounded border p-2 min-h-[80px]">
                <div className="text-xs opacity-70 mb-1">{d}</div>
                <div className="space-y-1">
                  {(monthByDay[d] || []).map((c) => (
                    <div key={c.id || c.title} className="truncate">
                      {c.link ? (
                        <Link
                          href={c.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {c.title}
                        </Link>
                      ) : (
                        <span>{c.title}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
