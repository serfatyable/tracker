'use client';
import { ArrowDownTrayIcon, CloudArrowDownIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { useOnCallFutureByUser } from '../../lib/hooks/useOnCallFutureByUser';
import { stationI18nKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Toast from '../ui/Toast';

export default function MyShiftsList({
  userId,
  daysAhead = 40,
}: {
  userId?: string;
  daysAhead?: number;
}) {
  const { t } = useTranslation();
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

  const downloadOptions = useMemo(
    () => [
      {
        id: 'gradient',
        label: translate('onCall.downloadOptionGradientLabel', 'Option A'),
        description: translate(
          'onCall.downloadOptionGradientDescription',
          'Vibrant gradient spotlight with a subtle glow.',
        ),
        buttonProps: {
          variant: 'ghost' as const,
          size: 'lg' as const,
          className:
            'w-full sm:w-auto bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-offset-0 focus-visible:ring-white/60 dark:focus-visible:ring-white/40',
          leftIcon: <SparklesIcon className="h-5 w-5" />,
        },
      },
      {
        id: 'outline',
        label: translate('onCall.downloadOptionOutlineLabel', 'Option B'),
        description: translate(
          'onCall.downloadOptionOutlineDescription',
          'Structured outline with an indigo accent and hover fill.',
        ),
        buttonProps: {
          variant: 'outline' as const,
          size: 'md' as const,
          className:
            'w-full sm:w-auto border-2 border-dashed border-indigo-400 text-indigo-600 dark:text-indigo-300 hover:border-indigo-500 hover:bg-indigo-500/10 focus-visible:ring-indigo-500',
          leftIcon: <ArrowDownTrayIcon className="h-5 w-5" />,
        },
      },
      {
        id: 'soft',
        label: translate('onCall.downloadOptionSoftLabel', 'Option C'),
        description: translate(
          'onCall.downloadOptionSoftDescription',
          'Soft glassmorphism-inspired pill with a gentle glow.',
        ),
        buttonProps: {
          variant: 'secondary' as const,
          size: 'md' as const,
          className:
            'w-full sm:w-auto bg-white/80 text-gray-900 shadow-inner shadow-gray-200/60 border border-white/60 backdrop-blur-sm hover:bg-white hover:shadow-md dark:bg-white/10 dark:text-white/90 dark:border-white/10 dark:hover:bg-white/20',
          leftIcon: <CloudArrowDownIcon className="h-5 w-5" />,
        },
      },
    ],
    [translate],
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
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              {translate('onCall.downloadOptionsHeading', 'Download options')}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
              {downloadOptions.map((option) => (
                <div
                  key={option.id}
                  className="flex w-full flex-col items-stretch gap-2 rounded-xl border border-gray-200/70 bg-white/80 p-3 text-left shadow-sm dark:border-white/10 dark:bg-white/5 sm:w-auto sm:max-w-[220px]"
                >
                  <Button
                    {...option.buttonProps}
                    onClick={handleDownload}
                    aria-label={`${option.label} – ${downloadLabel}`}
                  >
                    {downloadLabel}
                  </Button>
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {option.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-sm opacity-70">{t('ui.loading', { defaultValue: 'Loading…' })}</div>
        ) : grouped.length === 0 ? (
          <div className="text-sm opacity-70">
            {t('onCall.emptyMyShifts', { defaultValue: 'nothing in here' })}
          </div>
        ) : (
          <div className="space-y-3">
            {grouped.map((g) => (
              <button
                key={g.dateKey}
                className="rounded border p-3 border-gray-200 dark:border-[rgb(var(--border))] text-left w-full hover:bg-gray-50 dark:hover:bg-white/5"
                onClick={() => router.push(`/on-call?tab=team&date=${g.dateKey}`)}
              >
                <div className="text-xs opacity-70">{new Date(g.date).toLocaleDateString()}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {g.items.map((it, idx) => (
                    <span key={idx} className="pill text-xs">
                      {t(stationI18nKeys[it.stationKey as StationKey])}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>
      <Toast message={error} variant="error" onClear={() => setError(null)} />
    </>
  );
}
