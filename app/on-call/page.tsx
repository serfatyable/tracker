'use client';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
const MiniCalendar = dynamic(() => import('../../components/on-call/MiniCalendar'), { ssr: false });
import LargeTitleHeader from '../../components/layout/LargeTitleHeader';
import MyShiftsList from '../../components/on-call/MyShiftsList';
import NextShiftCard from '../../components/on-call/NextShiftCard';
import TeamForDate from '../../components/on-call/TeamForDate';
import TodayPanel from '../../components/on-call/TodayPanel';
import Card from '../../components/ui/Card';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { haptic } from '../../lib/utils/haptics';

export default function OnCallPage() {
  const { data: me } = useCurrentUserProfile();
  const { t } = useTranslation();
  const [tab, setTab] = useState<'my' | 'today' | 'team' | 'timeline'>('my');
  const nextRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  // Sync tab with URL query (?tab=...)
  useEffect(() => {
    const urlTab = (searchParams.get('tab') as 'my' | 'today' | 'team' | 'timeline' | null) || null;
    if (urlTab && urlTab !== tab) {
      setTab(urlTab);
    }
  }, [searchParams, tab]);

  const onScrollToNext = () => {
    haptic('light');
    nextRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const onSelectTab = (k: 'my' | 'today' | 'team' | 'timeline') => {
    setTab(k);
    haptic('light');
    try {
      const q = new URLSearchParams(searchParams.toString());
      q.set('tab', k);
      if (k !== 'team') q.delete('date');
      router.replace(`/on-call?${q.toString()}`, { scroll: false });
    } catch {
      /* ignore */
    }
  };

  return (
    <AppShell>
      <LargeTitleHeader
        title={t('onCall.title') as string}
        rightSlot={
          <div className="flex gap-2">
            {me?.role === 'admin' && (
              <Link
                href="/admin/on-call"
                className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
                onClick={() => haptic('light')}
              >
                📤 Upload
              </Link>
            )}
            <button onClick={onScrollToNext} className="pill text-sm">
              {t('onCall.nextShift', { defaultValue: 'Next shift' })}
            </button>
          </div>
        }
      />
      <div className="app-container p-3 sm:p-4 space-y-4">
        <div className="sticky top-[52px] z-20 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/70 py-2 border-b border-muted/20">
          <div className="flex gap-2">
            <button
              className={`tab-levitate ${tab === 'my' ? 'ring-1 ring-primary' : ''}`}
              onClick={() => onSelectTab('my')}
              aria-pressed={tab === 'my'}
            >
              {t('onCall.myShifts', { defaultValue: 'My Shifts' })}
            </button>
            <button
              className={`tab-levitate ${tab === 'today' ? 'ring-1 ring-primary' : ''}`}
              onClick={() => onSelectTab('today')}
              aria-pressed={tab === 'today'}
            >
              {t('onCall.today')}
            </button>
            <button
              className={`tab-levitate ${tab === 'team' ? 'ring-1 ring-primary' : ''}`}
              onClick={() => onSelectTab('team')}
              aria-pressed={tab === 'team'}
            >
              {t('onCall.team')}
            </button>
            <button
              className={`tab-levitate ${tab === 'timeline' ? 'ring-1 ring-primary' : ''}`}
              onClick={() => onSelectTab('timeline')}
              aria-pressed={tab === 'timeline'}
            >
              {t('onCall.timeline', { defaultValue: 'Timeline' })}
            </button>
          </div>
        </div>
        {tab === 'my' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="md:col-span-2">
              <MyShiftsList userId={me?.uid} daysAhead={40} />
            </div>
            <div className="md:col-span-1" ref={nextRef}>
              <Card>
                <NextShiftCard userId={me?.uid} />
              </Card>
            </div>
          </div>
        )}
        {tab === 'today' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="md:col-span-2">
              <Card className="space-y-3">
                <div className="text-sm font-medium">{t('onCall.today')}</div>
                <TodayPanel highlightUserId={me?.uid} />
              </Card>
            </div>
            <div className="md:col-span-1" ref={nextRef}>
              <Card>
                <NextShiftCard userId={me?.uid} />
              </Card>
            </div>
          </div>
        )}
        {tab === 'team' && (
          <Card className="space-y-3">
            <div className="text-sm font-medium">{t('onCall.teamOnDate', { date: '' })}</div>
            <TeamForDate initialDateKey={searchParams.get('date') || undefined} />
          </Card>
        )}
        {tab === 'timeline' && (
          <Card className="space-y-3">
            <div className="text-sm font-medium">
              {t('onCall.timeline', { defaultValue: 'Timeline' })}
            </div>
            <MiniCalendar />
          </Card>
        )}
      </div>
    </AppShell>
  );
}
