'use client';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { getFirebaseApp } from '@/lib/firebase/client';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import { ListSkeleton } from '@/components/dashboard/Skeleton';
import EmptyState, { CalendarIcon } from '@/components/ui/EmptyState';

type ScheduleEvent = {
  id: string;
  date: string;
  type: 'on-call' | 'meeting';
  title: string;
  subtitle?: string;
  icon: string;
};

export default function UpcomingSchedule() {
  const { t } = useTranslation();
  const { data: userProfile } = useCurrentUserProfile();
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.uid) return;

    const userId = userProfile.uid; // Capture uid to avoid null checks inside async function
    let mounted = true;

    async function loadSchedule() {
      try {
        const db = getFirestore(getFirebaseApp());
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(now.getDate() + 7);

        const onCallEvents: ScheduleEvent[] = [];
        const meetingEvents: ScheduleEvent[] = [];

        // Load on-call schedules
        try {
          const onCallSnap = await getDocs(collection(db, 'onCallSchedule'));
          onCallSnap.docs.forEach((doc) => {
            const data = doc.data();
            const dateStr = doc.id; // dateString is the document ID
            const eventDate = new Date(dateStr);

            if (eventDate >= now && eventDate <= sevenDaysFromNow) {
              const residents = data.residents || [];
              if (residents.includes(userId)) {
                onCallEvents.push({
                  id: `oncall-${dateStr}`,
                  date: dateStr,
                  type: 'on-call',
                  title: t('ui.home.schedule.onCall', { defaultValue: 'On-Call Duty' }) as string,
                  subtitle: data.location || '',
                  icon: '🚨',
                });
              }
            }
          });
        } catch (err) {
          console.error('Error loading on-call schedule:', err);
        }

        // Load morning meetings
        try {
          const meetingsSnap = await getDocs(collection(db, 'morningMeetings'));
          meetingsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const dateStr = doc.id;
            const eventDate = new Date(dateStr);

            if (eventDate >= now && eventDate <= sevenDaysFromNow) {
              meetingEvents.push({
                id: `meeting-${dateStr}`,
                date: dateStr,
                type: 'meeting',
                title: data.topic || t('ui.home.schedule.morningMeeting', { defaultValue: 'Morning Meeting' }),
                subtitle: data.lecturer
                  ? t('ui.home.schedule.lecturer', {
                      name: data.lecturer,
                      defaultValue: 'Lecturer: {{name}}',
                    })
                  : '',
                icon: '📚',
              });
            }
          });
        } catch (err) {
          console.error('Error loading morning meetings:', err);
        }

        if (mounted) {
          const allEvents = [...onCallEvents, ...meetingEvents].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          setEvents(allEvents);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading schedule:', error);
        if (mounted) {
          setEvents([]);
          setLoading(false);
        }
      }
    }

    loadSchedule();

    return () => {
      mounted = false;
    };
  }, [userProfile?.uid, t]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, ScheduleEvent[]>();

    events.forEach((event) => {
      const dateKey = event.date;
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(event);
    });

    return Array.from(groups.entries()).map(([date, items]) => ({
      date,
      items,
    }));
  }, [events]);

  if (loading) {
    return (
      <div className="card-levitate rounded-xl border p-5">
        <ListSkeleton items={3} />
      </div>
    );
  }

  return (
    <div className="card-levitate overflow-hidden rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/50 to-cyan-50/50 p-5 shadow-sm dark:border-sky-900/40 dark:from-sky-950/20 dark:to-cyan-950/20">
      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        📅 {t('ui.home.upcomingWeek', { defaultValue: 'This Week' })}
      </h3>

      {groupedEvents.length === 0 ? (
        <EmptyState
          icon={<CalendarIcon />}
          title={t('ui.home.noUpcomingEvents', { defaultValue: 'No upcoming events' })}
          description={t('ui.home.noUpcomingEventsDesc', {
            defaultValue: 'Your schedule for the next 7 days is clear.',
          })}
        />
      ) : (
        <div className="space-y-3">
          {groupedEvents.map(({ date, items }) => {
            const eventDate = new Date(date);
            const isToday = eventDate.toDateString() === new Date().toDateString();
            const isTomorrow =
              eventDate.toDateString() ===
              new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString();

            let dateLabel = eventDate.toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            });

            if (isToday) {
              dateLabel = t('ui.home.schedule.today', { defaultValue: 'Today' }) as string;
            } else if (isTomorrow) {
              dateLabel = t('ui.home.schedule.tomorrow', { defaultValue: 'Tomorrow' }) as string;
            }

            return (
              <div
                key={date}
                className={`rounded-lg border p-3 ${
                  isToday
                    ? 'border-sky-400 bg-sky-100/50 dark:border-sky-600 dark:bg-sky-900/30'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800/50'
                }`}
              >
                <div className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
                  {dateLabel}
                </div>
                <div className="space-y-2">
                  {items.map((event) => (
                    <div key={event.id} className="flex items-start gap-2">
                      <span className="text-lg">{event.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {event.title}
                        </div>
                        {event.subtitle && (
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {event.subtitle}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
