'use client';
import { useTranslation } from 'react-i18next';
import { useOnCallToday } from '../../lib/hooks/useOnCallToday';
import { stationI18nKeys, stationKeys } from '../../lib/on-call/stations';
import type { StationKey } from '../../types/onCall';
import Avatar from '../ui/Avatar';

export default function TodayPanel({ highlightUserId }: { highlightUserId?: string }) {
  const { t } = useTranslation();
  const { data, loading } = useOnCallToday();

  if (loading) return <div className="text-sm opacity-60">Loading…</div>;
  if (!data) return <div className="text-sm opacity-60">{t('onCall.noShifts')}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {stationKeys.map((sk) => {
        const entry = (data.stations as any)[sk] as { userId: string; userDisplayName: string } | undefined;
        if (!entry) return null;
        const isMe = highlightUserId && entry.userId === highlightUserId;
        return (
          <div key={sk} className={`rounded border p-3 ${isMe ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20' : 'border-gray-200 dark:border-gray-800'}`}>
            <div className="text-xs opacity-70">{t(stationI18nKeys[sk as StationKey])}</div>
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


