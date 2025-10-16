'use client';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import MiniCalendar from '../../components/on-call/MiniCalendar';
import NextShiftCard from '../../components/on-call/NextShiftCard';
import TeamForDate from '../../components/on-call/TeamForDate';
import TodayPanel from '../../components/on-call/TodayPanel';
import Card from '../../components/ui/Card';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';

export default function OnCallPage() {
  const { data: me } = useCurrentUserProfile();
  const { t } = useTranslation();
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl p-4 space-y-4">
        <h1 className="text-2xl font-semibold">{t('onCall.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Card className="space-y-3">
              <div className="text-sm font-medium">{t('onCall.today')}</div>
              <TodayPanel highlightUserId={me?.uid} />
            </Card>
          </div>
          <div className="md:col-span-1">
            <Card>
              <NextShiftCard userId={me?.uid} />
            </Card>
          </div>
        </div>
        <Card className="space-y-3">
          <div className="text-sm font-medium">{t('onCall.teamOnDate', { date: '' })}</div>
          <TeamForDate />
        </Card>
        <Card className="space-y-3">
          <div className="text-sm font-medium">Timeline</div>
          <MiniCalendar />
        </Card>
      </div>
    </AppShell>
  );
}
