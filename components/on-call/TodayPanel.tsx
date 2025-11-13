'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import type { StationAssignment } from '@/types/onCall';
import { useOnCallToday } from '../../lib/hooks/useOnCallToday';
import { getStationCardClasses } from '../../lib/on-call/stationColors';
import { stationI18nKeys, stationKeys } from '../../lib/on-call/stations';
import { Skeleton } from '../dashboard/Skeleton';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import EmptyState, { CalendarIcon } from '../ui/EmptyState';

export default function TodayPanel({ highlightUserId }: { highlightUserId?: string }) {
  const { t } = useTranslation();
  const { data, loading, error } = useOnCallToday();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]"
          >
            <Skeleton className="h-3 w-20 mb-2" />
            <div className="mt-1 flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<CalendarIcon size={40} />}
        title={t('ui.error', { defaultValue: 'Error' })}
        description={error}
        className="py-6"
        action={
          <Link href="/on-call?tab=timeline">
            <Button variant="secondary" size="md">
              {t('onCall.viewTimeline', { defaultValue: 'View Timeline' })}
            </Button>
          </Link>
        }
      />
    );
  }

  if (!data)
    return (
      <EmptyState
        icon={<CalendarIcon size={40} />}
        title={t('onCall.noShiftsToday', { defaultValue: 'No shifts scheduled' })}
        description={t('onCall.noShiftsTodayDesc', {
          defaultValue: 'There are no on-call assignments for today.',
        })}
        className="py-6"
        action={
          <Link href="/on-call?tab=timeline">
            <Button variant="secondary" size="md">
              {t('onCall.viewTimeline', { defaultValue: 'View Timeline' })}
            </Button>
          </Link>
        }
      />
    );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {stationKeys.map((sk) => {
        const entry: StationAssignment | undefined = data.stations[sk];
        if (!entry) return null;
        const isMe = highlightUserId && entry.userId === highlightUserId;
        return (
          <div key={sk} className={getStationCardClasses(sk, isMe)}>
            <div className="text-xs opacity-70">{t(stationI18nKeys[sk])}</div>
            <div className="mt-1 flex items-center gap-2">
              <Avatar name={entry.userDisplayName} size={20} />
              <div className="font-medium">{entry.userDisplayName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
