'use client';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

import { useOnCallUpcomingByUser } from '../../lib/hooks/useOnCallUpcomingByUser';
import { stationI18nKeys } from '../../lib/on-call/stations';
import { formatDateLocale } from '../../lib/utils/dateUtils';
import type { StationKey } from '../../types/onCall';
import { Skeleton } from '../dashboard/Skeleton';
import Button from '../ui/Button';
import EmptyState, { CalendarIcon } from '../ui/EmptyState';

export default function NextShiftCard({ userId }: { userId?: string }) {
  const { t, i18n } = useTranslation();
  const { next, loading, error } = useOnCallUpcomingByUser(userId);

  if (!userId) return null;

  if (loading) {
    return (
      <div className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]">
        <Skeleton className="h-3 w-24 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={<CalendarIcon size={36} />}
        title={t('ui.error', { defaultValue: 'Error' })}
        description={error}
        className="py-4"
        action={
          <Link href="/on-call?tab=timeline">
            <Button variant="secondary" size="sm">
              {t('onCall.viewTimeline', { defaultValue: 'View Timeline' })}
            </Button>
          </Link>
        }
      />
    );
  }

  if (!next)
    return (
      <EmptyState
        icon={<CalendarIcon size={36} />}
        title={t('onCall.noUpcomingShifts', { defaultValue: 'No upcoming shifts' })}
        description={t('onCall.noUpcomingShiftsDesc', {
          defaultValue: 'You have no scheduled on-call shifts.',
        })}
        className="py-4"
        action={
          <Link href="/on-call?tab=timeline">
            <Button variant="secondary" size="sm">
              {t('onCall.viewTimeline', { defaultValue: 'View Timeline' })}
            </Button>
          </Link>
        }
      />
    );

  const start = new Date(
    (next.startAt as any).seconds ? (next.startAt as any).seconds * 1000 : (next as any).startAt,
  );
  const dateStr = formatDateLocale(start, i18n.language);
  const stationLabel = t(stationI18nKeys[next.stationKey as StationKey]);

  return (
    <div className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]">
      <div className="text-xs opacity-70">{t('onCall.yourNextShift')}</div>
      <div className="mt-1 text-sm">
        {dateStr} — {stationLabel}
      </div>
    </div>
  );
}
