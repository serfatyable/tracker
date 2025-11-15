'use client';
import Link from 'next/link';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Toast from '../../components/ui/Toast';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import {
  useMorningMeetingsMultiMonth,
  useMorningMeetingsUpcoming,
} from '../../lib/hooks/useMorningClasses';
import { createSynonymMatcher } from '../../lib/search/synonyms';
import { haptic } from '../../lib/utils/haptics';
import { getLocalStorageItem, setLocalStorageItem } from '../../lib/utils/localStorage';
import type { UserProfile } from '../../types/auth';
import type { MorningMeeting } from '../../types/morningMeetings';
// Header composed inline for precise alignment

export default function MorningMeetingsPage(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { data: currentUser } = useCurrentUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const { meetingsByMonth, loading } = useMorningMeetingsMultiMonth(6);
  const { today, tomorrow, next7, loading: upcomingLoading } = useMorningMeetingsUpcoming();
  const [toast, setToast] = useState<{
    message: string;
    variant?: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);
  const [completedMeetings, setCompletedMeetings] = useState<Record<string, number>>(() =>
    getLocalStorageItem('morningMeetings:completed', {} as Record<string, number>),
  );

  useEffect(() => {
    setLocalStorageItem('morningMeetings:completed', completedMeetings);
  }, [completedMeetings]);

  const upcomingMeetingEntry = useMemo(() => {
    if (today && today.length > 0) return { meeting: today[0]!, bucket: 'today' as const };
    if (tomorrow && tomorrow.length > 0)
      return { meeting: tomorrow[0]!, bucket: 'tomorrow' as const };
    if (next7 && next7.length > 0) return { meeting: next7[0]!, bucket: 'next7' as const };
    return null;
  }, [next7, today, tomorrow]);

  const upcomingMeeting = upcomingMeetingEntry?.meeting ?? null;
  const upcomingMeetingKey = upcomingMeeting
    ? (upcomingMeeting.id ?? upcomingMeeting.dateKey)
    : null;
  const upcomingCompleted = upcomingMeetingKey
    ? Boolean(completedMeetings[upcomingMeetingKey])
    : false;

  const isUpcomingMeetingLecturer = useMemo(
    () => isUserLecturerForMeeting(currentUser, upcomingMeeting),
    [currentUser, upcomingMeeting],
  );

  const heroCopy = useMemo(() => {
    if (currentUser?.role === 'admin') {
      return {
        heading:
          t('morningMeetings.hero.adminHeading', {
            defaultValue: 'Coordinate the morning briefing schedule',
          }) || 'Coordinate the morning briefing schedule',
        subtitle:
          t('morningMeetings.hero.adminSubtitle', {
            defaultValue: 'Review presenters, share the agenda, and export the calendar feed.',
          }) || 'Review presenters, share the agenda, and export the calendar feed.',
      } as const;
    }
    if (isUpcomingMeetingLecturer) {
      return {
        heading:
          t('morningMeetings.hero.lecturerHeading', {
            defaultValue: "You're presenting soon",
          }) || "You're presenting soon",
        subtitle:
          t('morningMeetings.hero.lecturerSubtitle', {
            defaultValue: 'Double-check your slides, timing, and meeting link before you go live.',
          }) || 'Double-check your slides, timing, and meeting link before you go live.',
      } as const;
    }
    if (currentUser?.role === 'tutor') {
      return {
        heading:
          t('morningMeetings.hero.tutorHeading', {
            defaultValue: 'Support the upcoming sessions',
          }) || 'Support the upcoming sessions',
        subtitle:
          t('morningMeetings.hero.tutorSubtitle', {
            defaultValue: 'Share updates with residents and ensure every lecturer is ready to go.',
          }) || 'Share updates with residents and ensure every lecturer is ready to go.',
      } as const;
    }
    return {
      heading:
        t('morningMeetings.hero.defaultHeading', {
          defaultValue: 'Stay current on the morning meetings schedule',
        }) || 'Stay current on the morning meetings schedule',
      subtitle:
        t('morningMeetings.hero.defaultSubtitle', {
          defaultValue: 'Track upcoming presenters and quickly access meeting details.',
        }) || 'Track upcoming presenters and quickly access meeting details.',
    } as const;
  }, [currentUser?.role, isUpcomingMeetingLecturer, t]);

  const upcomingLabel = useMemo(() => {
    if (!upcomingMeetingEntry) return null;
    const labelKey = {
      today: 'morningMeetings.hero.todayLabel',
      tomorrow: 'morningMeetings.hero.tomorrowLabel',
      next7: 'morningMeetings.hero.soonLabel',
    }[upcomingMeetingEntry.bucket];
    return (
      t(labelKey, {
        defaultValue:
          upcomingMeetingEntry.bucket === 'today'
            ? 'Today'
            : upcomingMeetingEntry.bucket === 'tomorrow'
              ? 'Tomorrow'
              : 'Coming up',
      }) ||
      (upcomingMeetingEntry.bucket === 'today'
        ? 'Today'
        : upcomingMeetingEntry.bucket === 'tomorrow'
          ? 'Tomorrow'
          : 'Coming up')
    );
  }, [t, upcomingMeetingEntry]);

  const scrollToDay = useCallback(
    (targetDate: Date) => {
      const element = document.getElementById(`day-${targetDate.getDate()}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        element.classList.add('ring-2', 'ring-blue-500/80', 'rounded-lg');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500/80', 'rounded-lg');
        }, 2000);
      } else {
        setToast({
          message:
            t('morningMeetings.hero.noTodayAnchor', {
              defaultValue: 'There is no session anchored for today yet.',
            }) || 'There is no session anchored for today yet.',
          variant: 'info',
        });
      }
    },
    [t],
  );

  const handleJumpToToday = useCallback(() => {
    haptic('light');
    scrollToDay(new Date());
  }, [scrollToDay]);

  const handleCopyLink = useCallback(async () => {
    if (!upcomingMeeting?.link) {
      setToast({
        message:
          t('morningMeetings.hero.noLink', {
            defaultValue: 'No meeting link available yet.',
          }) || 'No meeting link available yet.',
        variant: 'warning',
      });
      haptic('error');
      return;
    }
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard) {
        throw new Error('Clipboard not available');
      }
      await navigator.clipboard.writeText(upcomingMeeting.link);
      setToast({
        message:
          t('morningMeetings.hero.copySuccess', {
            defaultValue: 'Meeting link copied to clipboard.',
          }) || 'Meeting link copied to clipboard.',
        variant: 'success',
      });
      haptic('success');
    } catch (error) {
      console.error('Failed to copy meeting link', error);
      setToast({
        message:
          t('morningMeetings.hero.copyError', {
            defaultValue: 'Unable to copy the meeting link. Try again or copy manually.',
          }) || 'Unable to copy the meeting link. Try again or copy manually.',
        variant: 'error',
      });
      haptic('error');
    }
  }, [t, upcomingMeeting]);

  const handleMarkComplete = useCallback(() => {
    if (!upcomingMeetingKey || upcomingCompleted) return;
    haptic('success');
    setCompletedMeetings((prev) => ({ ...prev, [upcomingMeetingKey]: Date.now() }));
    setToast({
      message:
        t('morningMeetings.hero.markedComplete', {
          defaultValue: 'Marked complete. Great job!',
        }) || 'Marked complete. Great job!',
      variant: 'success',
    });
  }, [t, upcomingCompleted, upcomingMeetingKey]);

  const filteredMeetings = useMemo(() => {
    const monthMeetings = meetingsByMonth.get(selectedMonth) || [];
    const matcher = createSynonymMatcher(searchTerm);
    return monthMeetings.filter(
      (m) =>
        matcher(m.title) || matcher(m.lecturer) || matcher(m.moderator) || matcher(m.organizer),
    );
  }, [meetingsByMonth, selectedMonth, searchTerm]);

  const meetingsByWeek = useMemo(() => groupByWeek(filteredMeetings), [filteredMeetings]);

  const formatMonthTab = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year!, month!);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  // nextMeeting reserved for future enhancements

  return (
    <AppShell>
      <Toast
        message={toast?.message ?? null}
        variant={toast?.variant}
        onClear={() => setToast(null)}
      />
      <div className="sticky top-0 z-30 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-2 backdrop-blur-md bg-bg/85 supports-[backdrop-filter]:bg-bg/75 border-b border-muted/20">
        <div className="app-container px-0">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-bold text-2xl sm:text-3xl leading-tight truncate">
              {t('morningMeetings.title')}
            </h1>
            <div className="flex gap-2 min-w-0">
              {currentUser?.role === 'admin' && (
                <Link
                  href="/admin/morning-meetings"
                  className="inline-flex items-center justify-center rounded-md border border-blue-500 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 min-h-[32px]"
                  onClick={() => haptic('light')}
                >
                  📤 Upload
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="app-container p-4 space-y-6">
        <section className="card-levitate overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white">
          <div className="p-6 space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <p className="text-sm uppercase tracking-wide text-white/80">
                  {t('morningMeetings.hero.quickGlance', { defaultValue: 'Upcoming focus' })}
                </p>
                <h2 className="text-2xl font-semibold sm:text-3xl">{heroCopy.heading}</h2>
                <p className="max-w-2xl text-sm text-white/85 sm:text-base">{heroCopy.subtitle}</p>
              </div>
              <div className="w-full rounded-lg border border-white/20 bg-white/10 p-4 text-white shadow-inner sm:w-auto">
                {upcomingLoading ? (
                  <div className="flex flex-col gap-2">
                    <div className="h-4 w-32 animate-pulse rounded bg-white/20" />
                    <div className="h-5 w-48 animate-pulse rounded bg-white/20" />
                    <div className="h-4 w-40 animate-pulse rounded bg-white/10" />
                  </div>
                ) : upcomingMeeting ? (
                  <div className="space-y-2">
                    {upcomingLabel ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                        <span>📅</span>
                        {upcomingLabel}
                      </span>
                    ) : null}
                    <h3 className="text-lg font-semibold leading-tight">{upcomingMeeting.title}</h3>
                    <div className="text-sm text-white/85">
                      <div>
                        {upcomingMeeting.date
                          .toDate()
                          .toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                            weekday: 'long',
                            month: 'short',
                            day: 'numeric',
                          })}
                      </div>
                      <div>
                        {upcomingMeeting.date
                          .toDate()
                          .toLocaleTimeString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </div>
                      {upcomingMeeting.lecturer ? (
                        <div>
                          {t('morningMeetings.lecturer', { defaultValue: 'Lecturer' })}:{' '}
                          <span className="font-medium">{upcomingMeeting.lecturer}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-white/85">
                    <h3 className="text-lg font-semibold">
                      {t('morningMeetings.hero.noUpcoming', {
                        defaultValue: 'No upcoming meetings to highlight',
                      })}
                    </h3>
                    <p>
                      {t('morningMeetings.hero.noUpcomingSubtitle', {
                        defaultValue: 'Meetings will appear here once they are scheduled.',
                      })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleJumpToToday}
                className="bg-white/15 text-white hover:bg-white/25"
              >
                {t('morningMeetings.hero.jumpToToday', { defaultValue: 'Jump to today' })}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyLink}
                disabled={!upcomingMeeting?.link}
                className="bg-white/15 text-white hover:bg-white/25 disabled:bg-white/10 disabled:text-white/70"
              >
                {t('morningMeetings.hero.copyLink', { defaultValue: 'Copy meeting link' })}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkComplete}
                disabled={upcomingCompleted || !upcomingMeetingKey}
                className="bg-white/15 text-white hover:bg-white/25 disabled:bg-white/10 disabled:text-white/70"
              >
                {upcomingCompleted
                  ? t('morningMeetings.hero.completed', { defaultValue: 'Completed' })
                  : t('morningMeetings.hero.markComplete', { defaultValue: 'Mark complete' })}
              </Button>
            </div>

            <div className="rounded-lg border border-white/15 bg-white/10 p-4 text-white/90">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 text-lg">
                    📥
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-wide">
                      {t('morningMeetings.hero.calendarExport', {
                        defaultValue: 'Calendar export',
                      })}
                    </h3>
                    <p className="text-xs text-white/75">
                      {t('morningMeetings.hero.calendarExportSubtitle', {
                        defaultValue:
                          'Use the authenticated feed to sync meetings to your calendar.',
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href="/api/ics/morning-meetings?personal=true"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => haptic('light')}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-white/40 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
                  >
                    <span>👤</span>
                    {t('morningMeetings.myIcs', { defaultValue: 'My Meetings (ICS)' })}
                  </a>
                  <a
                    href="/api/ics/morning-meetings"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => haptic('light')}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    <span>🌐</span>
                    {t('morningMeetings.allIcs', { defaultValue: 'All Morning Meetings (ICS)' })}
                  </a>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/70">
                {t('morningMeetings.exportHelp', {
                  defaultValue:
                    'Copy the link and add it as a calendar subscription in Google Calendar, Apple Calendar, or Outlook',
                })}
              </p>
            </div>
          </div>
        </section>
        {/* Header search */}
        <div className="flex gap-2 items-center">
          <Input
            type="text"
            placeholder={t('ui.search', { defaultValue: 'Search' }) + '...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
          {searchTerm ? (
            <Button variant="ghost" onClick={() => setSearchTerm('')} className="px-2">
              ✕
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100"></div>
            <p className="mt-4 text-gray-500 dark:text-gray-400">
              {t('common.loading', { defaultValue: 'Loading...' })}
            </p>
          </div>
        ) : meetingsByMonth.size === 0 ? (
          <div className="card-levitate p-12 text-center">
            <div className="text-4xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {t('morningMeetings.noMeetings', { defaultValue: 'No meetings scheduled' })}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('morningMeetings.noMeetingsDescription', {
                defaultValue: 'Check back later for upcoming meetings',
              })}
            </p>
          </div>
        ) : (
          <>
            {/* Month tabs */}
            <div className="border-b border-gray-200 dark:border-[rgb(var(--border))] overflow-x-auto">
              <div className="flex space-x-2 pb-2">
                {Array.from(meetingsByMonth.keys()).map((monthKey) => {
                  const count = meetingsByMonth.get(monthKey)?.length || 0;
                  const isSelected = selectedMonth === monthKey;
                  const isCurrent = monthKey === currentMonthKey;

                  return (
                    <button
                      key={monthKey}
                      onClick={() => {
                        setSelectedMonth(monthKey);
                        haptic('light');
                      }}
                      className={`
                        flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-all whitespace-nowrap min-h-[44px]
                        ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-medium'
                            : 'border-transparent hover:bg-gray-50 dark:hover:bg-[rgb(var(--surface-elevated))] text-gray-600 dark:text-[rgb(var(--muted))]'
                        }
                      `}
                    >
                      {formatMonthTab(monthKey)}
                      {isCurrent && (
                        <Badge className="bg-green-600 text-white text-xs font-semibold">
                          {t('morningMeetings.current', { defaultValue: 'Current' })}
                        </Badge>
                      )}
                      <Badge className="bg-gray-200 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] text-xs">
                        {count}
                      </Badge>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meetings list for selected month */}
            {filteredMeetings.length === 0 ? (
              <div className="card-levitate p-12 text-center">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {t('ui.noResults', { defaultValue: 'No results found' })}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('ui.tryDifferentSearch', { defaultValue: 'Try adjusting your search terms' })}
                </p>
                {searchTerm && (
                  <Button onClick={() => setSearchTerm('')} className="mt-4" variant="outline">
                    {t('ui.clearSearch', { defaultValue: 'Clear search' })}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {meetingsByWeek.map((week, weekIdx) => (
                  <div key={weekIdx} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {formatWeekLabel(week[0]!.date.toDate(), i18n.language)}
                      </div>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-[rgb(var(--border))]" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                      {week.map((meeting, idx) => {
                        const date = meeting.date.toDate();
                        const isFirstOfDay =
                          idx === 0 || date.getDate() !== week[idx - 1]!.date.toDate().getDate();
                        return (
                          <div
                            key={meeting.id}
                            id={isFirstOfDay ? `day-${date.getDate()}` : undefined}
                            className="scroll-mt-24"
                          >
                            <MeetingCard meeting={meeting} language={i18n.language} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

// Meeting card component
function MeetingCard({ meeting, language }: { meeting: MorningMeeting; language: string }) {
  const { t } = useTranslation();
  const date = meeting.date.toDate();
  const month = date.getMonth();

  // Color coding by month
  const monthColors = [
    'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', // January
    'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800', // February
    'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800', // March
    'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800', // April
    'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800', // May
    'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800', // June
    'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', // July
    'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800', // August
    'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800', // September
    'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800', // October
    'bg-lime-50 dark:bg-lime-950/30 border-lime-200 dark:border-lime-800', // November
    'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800', // December
  ];

  const monthBorders = [
    'border-l-4 border-blue-500',
    'border-l-4 border-green-500',
    'border-l-4 border-purple-500',
    'border-l-4 border-orange-500',
    'border-l-4 border-pink-500',
    'border-l-4 border-teal-500',
    'border-l-4 border-indigo-500',
    'border-l-4 border-yellow-500',
    'border-l-4 border-red-500',
    'border-l-4 border-cyan-500',
    'border-l-4 border-lime-500',
    'border-l-4 border-amber-500',
  ];

  return (
    <div
      className={`card-levitate p-4 hover:shadow-lg transition-shadow border ${monthColors[month]} ${monthBorders[month]}`}
    >
      <div className="flex gap-4">
        {/* Date badge */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg py-2 shadow-sm">
            <div className="text-xs font-medium uppercase opacity-90">{meeting.dayOfWeek}</div>
            <div className="text-2xl font-bold">{date.getDate()}</div>
            <div className="text-xs opacity-90">
              {date.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
                month: 'short',
              })}
            </div>
          </div>
        </div>

        {/* Meeting details */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 text-lg">
            {meeting.title}
          </h3>

          <div className="space-y-1.5 text-sm">
            {meeting.lecturer && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="text-base">👨‍⚕️</span>
                <span className="font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('morningMeetings.lecturer', { defaultValue: 'Lecturer' })}:
                </span>
                <span>{meeting.lecturer}</span>
              </div>
            )}

            {meeting.moderator && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="text-base">🎤</span>
                <span className="font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('morningMeetings.moderator', { defaultValue: 'Moderator' })}:
                </span>
                <span>{meeting.moderator}</span>
              </div>
            )}

            {meeting.organizer && (
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span className="text-base">📋</span>
                <span className="font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                  {t('morningMeetings.organizer', { defaultValue: 'Organizer' })}:
                </span>
                <span>{meeting.organizer}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
              <span className="text-base">🕐</span>
              <span className="font-medium text-gray-700 dark:text-[rgb(var(--fg))]">
                {t('common.time', { defaultValue: 'Time' })}:
              </span>
              <span>
                {date.toLocaleTimeString(language === 'he' ? 'he-IL' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {meeting.notes && (
            <div className="mt-3 p-2 bg-gray-50 dark:bg-[rgb(var(--surface-elevated))] rounded text-sm text-gray-600 dark:text-[rgb(var(--muted))] italic border-l-2 border-gray-300 dark:border-[rgb(var(--border))]">
              {meeting.notes}
            </div>
          )}

          {meeting.link && (
            <div className="mt-3">
              <Link
                href={meeting.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                <span>🔗</span>
                {t('morningMeetings.viewLink', { defaultValue: 'View Link' })}
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions
function groupByWeek(meetings: MorningMeeting[]): MorningMeeting[][] {
  const weeks: MorningMeeting[][] = [];
  let currentWeek: MorningMeeting[] = [];
  let lastWeekNumber = -1;

  meetings
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())
    .forEach((meeting) => {
      const date = meeting.date.toDate();
      const weekNumber = getWeekNumber(date);

      if (weekNumber !== lastWeekNumber && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(meeting);
      lastWeekNumber = weekNumber;
    });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function formatWeekLabel(date: Date, language: string): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)

  const formatter = (d: Date) =>
    d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  return `${formatter(start)} - ${formatter(end)}`;
}

function isUserLecturerForMeeting(
  user: UserProfile | null,
  meeting: MorningMeeting | null,
): boolean {
  if (!user || !meeting) return false;

  if (meeting.lecturerUserId && meeting.lecturerUserId === user.uid) {
    return true;
  }

  if (user.email && meeting.lecturerEmailResolved && meeting.lecturerEmailResolved === user.email) {
    return true;
  }

  if (user.fullName && typeof meeting.lecturer === 'string') {
    const normalizedUser = user.fullName.trim().toLowerCase();
    const normalizedLecturer = meeting.lecturer.trim().toLowerCase();
    if (normalizedUser && normalizedLecturer) {
      if (
        normalizedUser === normalizedLecturer ||
        normalizedLecturer.includes(normalizedUser) ||
        normalizedUser.includes(normalizedLecturer)
      ) {
        return true;
      }
    }
  }

  return false;
}
