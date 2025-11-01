'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useMorningMeetingsMultiMonth } from '../../../lib/hooks/useMorningClasses';
import type { MorningMeeting } from '../../../types/morningMeetings';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

interface MorningMeetingsViewProps {
  showUploadButton?: boolean;
}

export default function MorningMeetingsView({
  showUploadButton = false,
}: MorningMeetingsViewProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');

  // Get current month key
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Fetch meetings for the next 6 months
  const { meetingsByMonth, loading } = useMorningMeetingsMultiMonth(6);

  // Filter meetings by search term
  const filteredMeetings = useMemo(() => {
    const monthMeetings = meetingsByMonth.get(selectedMonth) || [];
    if (!searchTerm.trim()) return monthMeetings;

    const needle = searchTerm.toLowerCase();
    return monthMeetings.filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        m.lecturer?.toLowerCase().includes(needle) ||
        m.moderator?.toLowerCase().includes(needle) ||
        m.organizer?.toLowerCase().includes(needle),
    );
  }, [meetingsByMonth, selectedMonth, searchTerm]);

  // Group meetings by week with day info
  const meetingsByWeek = useMemo(() => {
    return groupByWeek(filteredMeetings);
  }, [filteredMeetings]);

  // Scroll to specific day
  const scrollToDay = (day: number) => {
    const element = document.getElementById(`day-${day}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add a brief highlight effect
      element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
      }, 2000);
    }
  };

  // Group meetings by day for calendar view
  const meetingsByDay = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const allMonthMeetings = meetingsByMonth.get(selectedMonth) || [];
    const daysInMonth = new Date(year!, month! + 1, 0).getDate();

    const map: Record<number, MorningMeeting[]> = {};
    allMonthMeetings.forEach((meeting) => {
      const d = meeting.date.toDate();
      const dd = d.getDate();
      map[dd] = map[dd] || [];
      map[dd].push(meeting);
    });

    return { daysInMonth, map };
  }, [meetingsByMonth, selectedMonth]);

  // Format month name for display
  const formatMonthTab = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year!, month!);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header with Upload Button (admin only) and Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {showUploadButton && (
            <Button
              onClick={() => router.push('/admin/morning-meetings')}
              className="inline-flex items-center gap-2 btn-levitate border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
              variant="outline"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              {t('morningMeetings.import.uploadExcel')}
            </Button>
          )}
          <div
            className={`flex gap-2 items-center w-full sm:w-auto ${!showUploadButton ? 'sm:ml-auto' : ''}`}
          >
            <Input
              type="text"
              placeholder={t('ui.search', { defaultValue: 'Search' }) + '...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
            {searchTerm && (
              <Button variant="ghost" onClick={() => setSearchTerm('')} className="px-2">
                ✕
              </Button>
            )}
          </div>
        </div>

        {/* Calendar Export Section */}
        <div className="card-levitate p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <span className="text-xl">📅</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {t('morningMeetings.exportToCalendar', { defaultValue: 'Export to Calendar' })}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {t('morningMeetings.exportDescription', {
                    defaultValue: 'Subscribe to get automatic updates in your calendar app',
                  })}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {/* Export my meetings */}
              <a
                href="/api/ics/morning-meetings?personal=true"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white dark:bg-[rgb(var(--surface))] border-2 border-blue-300 dark:border-blue-700 rounded-lg text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all shadow-sm hover:shadow-md font-medium"
              >
                <span className="text-sm">👤</span>
                <span className="text-sm">
                  {t('morningMeetings.exportMy', { defaultValue: 'My Meetings' })}
                </span>
              </a>

              {/* Export all meetings */}
              <a
                href="/api/ics/morning-meetings"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 rounded-lg text-white transition-all shadow-sm hover:shadow-md font-medium"
              >
                <span className="text-sm">🌐</span>
                <span className="text-sm">
                  {t('morningMeetings.exportAll', { defaultValue: 'All Meetings' })}
                </span>
              </a>
            </div>
          </div>

          {/* Help text */}
          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              💡{' '}
              {t('morningMeetings.exportHelp', {
                defaultValue:
                  'Copy the link and add it as a calendar subscription in Google Calendar, Apple Calendar, or Outlook',
              })}
            </p>
          </div>
        </div>
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
                    onClick={() => setSelectedMonth(monthKey)}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-t-lg border-b-2 transition-all whitespace-nowrap
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

          {/* Calendar Bird's Eye View */}
          {!searchTerm && (
            <div className="card-levitate p-4">
              <div className="mb-3 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <span>📅</span>
                {t('morningMeetings.monthOverview', { defaultValue: 'Month Overview' })}
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {/* Day headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, _idx) => (
                  <div
                    key={day}
                    className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
                  >
                    {t(`common.days.${day.toLowerCase()}`, { defaultValue: day })}
                  </div>
                ))}

                {/* Calendar days */}
                {Array.from({ length: meetingsByDay.daysInMonth }, (_, i) => i + 1).map((d) => {
                  const dayMeetings = meetingsByDay.map[d] || [];
                  const _hasSearch = searchTerm.trim() !== '';
                  const isToday = (() => {
                    const today = new Date();
                    const [year, month] = selectedMonth.split('-').map(Number);
                    return (
                      today.getDate() === d &&
                      today.getMonth() === month &&
                      today.getFullYear() === year
                    );
                  })();

                  return (
                    <div
                      key={d}
                      onClick={() => dayMeetings.length > 0 && scrollToDay(d)}
                      className={`
                        rounded-lg border p-2 min-h-[80px] transition-all hover:shadow-md hover:scale-105
                        ${dayMeetings.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                        ${
                          isToday
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-opacity-50'
                            : 'border-gray-200 dark:border-[rgb(var(--border))] hover:border-gray-300 dark:hover:border-[rgb(var(--border-strong))]'
                        }
                      `}
                      title={
                        dayMeetings.length > 0
                          ? t('morningMeetings.clickToView', {
                              defaultValue: 'Click to view details',
                            })
                          : ''
                      }
                    >
                      <div
                        className={`
                        text-xs font-medium mb-1 flex items-center justify-between
                        ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                      `}
                      >
                        <span>
                          {dayMeetings[0]?.dayOfWeek || ''} {d}
                        </span>
                        {isToday && (
                          <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                            •
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayMeetings.map((meeting) => (
                          <div
                            key={meeting.id}
                            className="truncate text-xs p-1 rounded bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 text-blue-900 dark:text-blue-200 border-l-2 border-blue-500"
                            title={`${meeting.title}${meeting.lecturer ? ` - ${meeting.lecturer}` : ''}`}
                          >
                            {meeting.title}
                          </div>
                        ))}
                        {dayMeetings.length === 0 && (
                          <div className="text-xs text-gray-400 dark:text-gray-600 italic">
                            {t('common.noEvents', { defaultValue: '-' })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Detailed Meetings list for selected month */}
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
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {t('morningMeetings.detailedView', { defaultValue: 'Detailed View' })}
                </span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-[rgb(var(--border))]" />
              </div>
              {meetingsByWeek.map((week, _weekIdx) => (
                <div key={_weekIdx} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {formatWeekLabel(week[0]!.date.toDate(), i18n.language)}
                    </div>
                    <div className="flex-1 h-px bg-gray-200 dark:bg-[rgb(var(--border))]" />
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {week.map((meeting, _idx) => {
                      const date = meeting.date.toDate();
                      const isFirstOfDay =
                        _idx === 0 || date.getDate() !== week[_idx - 1]!.date.toDate().getDate();
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
