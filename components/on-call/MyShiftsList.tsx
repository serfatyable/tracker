'use client';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import type { StationKey } from '@/types/onCall';
import { getFirebaseApp } from '../../lib/firebase/client';
import { useOnCallFutureByUser } from '../../lib/hooks/useOnCallFutureByUser';
import { DEFAULT_DAYS_AHEAD } from '../../lib/on-call/constants';
import { getShiftsWithConflicts, getConflictBadgeClasses } from '../../lib/on-call/conflictDetection';
import { getStationBadgeClasses } from '../../lib/on-call/stationColors';
import { stationI18nKeys } from '../../lib/on-call/stations';
import { formatDateLocale } from '../../lib/utils/dateUtils';
import { Skeleton } from '../dashboard/Skeleton';
import Button from '../ui/Button';
import Card from '../ui/Card';
import EmptyState, { CalendarIcon } from '../ui/EmptyState';
import Toast from '../ui/Toast';

export default function MyShiftsList({
  userId,
  daysAhead = DEFAULT_DAYS_AHEAD,
}: {
  userId?: string;
  daysAhead?: number;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { shifts, loading } = useOnCallFutureByUser(userId, daysAhead);
  const [error, setError] = useState<string | null>(null);

  const translate = useCallback(
    (key: string, defaultValue: string) => {
      const value = t(key, { defaultValue });
      if (typeof value === 'string' && value.trim().length > 0) {
        return value;
      }
      return defaultValue;
    },
    [t],
  );

  const downloadLabel = translate('onCall.downloadMyIcs', 'Download My ICS');
  const optionLabel = translate('onCall.downloadOptionGradientLabel', 'Option A');
  const optionDescription = translate(
    'onCall.downloadOptionGradientDescription',
    'Vibrant gradient spotlight with a subtle glow.',
  );

  const grouped = useMemo(() => {
    const map = new Map<string, { date: Date; items: { stationKey: string }[] }>();
    for (const s of shifts) {
      const bucket = map.get(s.dateKey) || { date: s.date, items: [] };
      bucket.items.push({ stationKey: s.stationKey });
      map.set(s.dateKey, bucket);
    }
    return Array.from(map.entries()).map(([dateKey, { date, items }]) => ({
      dateKey,
      date,
      items,
    }));
  }, [shifts]);

  const conflicts = useMemo(() => getShiftsWithConflicts(shifts), [shifts]);

  const handleDownload = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    const user = auth.currentUser;

    if (!user) {
      setError(
        (t('auth.signInRequired', {
          defaultValue: 'Please sign in to download your calendar.',
        }) as string) || 'Please sign in to download your calendar.',
      );
      return;
    }

    setError(null);
    let downloadUrl: string | null = null;

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/ics/on-call?personal=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message =
          (t('onCall.downloadError', {
            defaultValue: 'Failed to download calendar.',
          }) as string) || 'Failed to download calendar.';

        try {
          const data = await response.json();
          if (data && typeof data.error === 'string') {
            message = data.error;
          }
        } catch (jsonError) {
          console.warn('Failed to parse error response for on-call ICS download', jsonError);
        }

        throw new Error(message);
      }

      const blob = await response.blob();
      downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'on-call.ics';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Failed to download on-call ICS', err);
      const fallback =
        (t('onCall.downloadError', {
          defaultValue: 'Failed to download calendar.',
        }) as string) || 'Failed to download calendar.';
      setError(err instanceof Error && err.message ? err.message : fallback);
    } finally {
      if (downloadUrl) {
        URL.revokeObjectURL(downloadUrl);
      }
    }
  }, [t]);

  if (!userId) return null;

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-sm font-medium">
            {t('onCall.myShifts', { defaultValue: 'My Shifts' })}
          </div>
          <div className="flex w-full flex-col gap-3 text-left lg:w-auto lg:text-right">
            <div className="flex flex-col gap-2 rounded-xl border border-gray-200/70 bg-white/80 p-4 text-left shadow-sm dark:border-white/10 dark:bg-white/5 sm:w-72">
              <Button
                variant="ghost"
                size="lg"
                className="w-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 transition-transform hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-offset-0 focus-visible:ring-white/60 active:translate-y-0 dark:focus-visible:ring-white/40"
                leftIcon={<SparklesIcon className="h-5 w-5" />}
                onClick={handleDownload}
                aria-label={`${optionLabel} – ${downloadLabel}`}
              >
                {downloadLabel}
              </Button>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                {optionLabel}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300">{optionDescription}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))]"
              >
                <Skeleton className="h-3 w-24 mb-2" />
                <div className="flex gap-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : grouped.length === 0 ? (
          <EmptyState
            icon={<CalendarIcon size={40} />}
            title={t('onCall.noUpcomingShifts', { defaultValue: 'No upcoming shifts' })}
            description={t('onCall.noUpcomingShiftsDesc', {
              defaultValue: 'You have no scheduled on-call shifts in the near future.',
            })}
            className="py-6"
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => router.push('/on-call?tab=timeline')}
              >
                {t('onCall.viewTimeline', { defaultValue: 'View Timeline' })}
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {grouped.map((g) => {
              const conflict = conflicts.get(g.dateKey);
              return (
                <button
                  key={g.dateKey}
                  className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))] text-left w-full hover:bg-gray-50 dark:hover:bg-white/5"
                  onClick={() => router.push(`/on-call?tab=team&date=${g.dateKey}`)}
                  title={conflict?.message}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs opacity-70">{formatDateLocale(new Date(g.date), i18n.language)}</div>
                    {conflict && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConflictBadgeClasses(conflict.severity)}`}
                      >
                        {conflict.type === 'multiple_same_day' ? '⚠️ Multiple' : 'ℹ️ Consecutive'}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {g.items.map((it, idx) => (
                      <span key={idx} className={getStationBadgeClasses(it.stationKey as StationKey)}>
                        {t(stationI18nKeys[it.stationKey as StationKey])}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>
      <Toast message={error} variant="error" onClear={() => setError(null)} />
    </>
  );
}
