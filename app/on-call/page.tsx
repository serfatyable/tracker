"use client";
import TopBar from '../../components/TopBar';
import TodayPanel from '../../components/on-call/TodayPanel';
import NextShiftCard from '../../components/on-call/NextShiftCard';
import TeamForDate from '../../components/on-call/TeamForDate';
import MiniCalendar from '../../components/on-call/MiniCalendar';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useTranslation } from 'react-i18next';

export default function OnCallPage() {
  const { data: me } = useCurrentUserProfile();
  const { t } = useTranslation();
  return (
    <div>
      <TopBar />
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <h1 className="text-xl font-semibold">{t('onCall.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <div className="glass-card p-4 space-y-3">
              <div className="text-sm font-medium">{t('onCall.today')}</div>
              <TodayPanel highlightUserId={me?.uid} />
            </div>
          </div>
          <div className="md:col-span-1">
            <div className="glass-card p-4">
              <NextShiftCard userId={me?.uid} />
            </div>
          </div>
        </div>
        <div className="glass-card p-4 space-y-3">
          <div className="text-sm font-medium">{t('onCall.teamOnDate', { date: '' })}</div>
          <TeamForDate />
        </div>
        <div className="glass-card p-4 space-y-3">
          <div className="text-sm font-medium">Timeline</div>
          <MiniCalendar />
        </div>
      </div>
    </div>
  );
}


