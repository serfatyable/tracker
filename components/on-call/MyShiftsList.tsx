'use client';
import { getAuth } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '../../lib/firebase/client';
import { useOnCallFutureByUser } from '../../lib/hooks/useOnCallFutureByUser';
import { stationI18nKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';
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
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium">
            {t('onCall.myShifts', { defaultValue: 'My Shifts' })}
          </div>
          <button type="button" className="pill text-xs" onClick={handleDownload}>
            {t('onCall.downloadMyIcs', { defaultValue: 'Download My ICS' })}
          </button>
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
