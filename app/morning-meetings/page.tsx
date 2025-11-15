'use client';
import Link from 'next/link';
import { type ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import AppShell from '../../components/layout/AppShell';
import MorningMeetingFilters, {
  type PresetFilterKey,
  type RoleFilterKey,
} from '../../components/morning-meetings/Filters';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useCurrentUserProfile } from '../../lib/hooks/useCurrentUserProfile';
import { useMorningMeetingsMultiMonth } from '../../lib/hooks/useMorningClasses';
import { createSynonymMatcher } from '../../lib/search/synonyms';
import { haptic } from '../../lib/utils/haptics';
import type { MorningMeeting } from '../../types/morningMeetings';
// Header composed inline for precise alignment

export default function MorningMeetingsPage(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { data: currentUser } = useCurrentUserProfile();
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const { meetingsByMonth, loading } = useMorningMeetingsMultiMonth(6);
  const [filters, setFilters] = useState<{
    searchTerm: string;
    roles: RoleFilterKey[];
    presets: PresetFilterKey[];
  }>({
    searchTerm: '',
    roles: [],
    presets: [],
  });

  const normalizeValue = useCallback((value?: string | null) => {
    if (!value) return null;
    return value.trim().toLowerCase();
  }, []);

  const userIdentifiers = useMemo(() => {
    const identifiers = new Set<string>();
    if (currentUser?.fullName) {
      const normalized = normalizeValue(currentUser.fullName);
      if (normalized) identifiers.add(normalized);
    }
    if (currentUser?.fullNameHe) {
      const normalized = normalizeValue(currentUser.fullNameHe);
      if (normalized) identifiers.add(normalized);
    }
    if (currentUser?.email) {
      const normalized = normalizeValue(currentUser.email);
      if (normalized) identifiers.add(normalized);
    }
    return Array.from(identifiers);
  }, [currentUser?.email, currentUser?.fullName, currentUser?.fullNameHe, normalizeValue]);

  const hasUserIdentifiers = userIdentifiers.length > 0;

  const handleSearchChange = useCallback((value: string) => {
    setFilters((prev) => ({ ...prev, searchTerm: value }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setFilters((prev) => ({ ...prev, searchTerm: '' }));
  }, []);

  const toggleRoleFilter = useCallback((role: RoleFilterKey) => {
    setFilters((prev) => {
      const exists = prev.roles.includes(role);
      const roles = exists ? prev.roles.filter((item) => item !== role) : [...prev.roles, role];
      return { ...prev, roles };
    });
  }, []);

  const togglePresetFilter = useCallback((preset: PresetFilterKey) => {
    setFilters((prev) => {
      const exists = prev.presets.includes(preset);
      const presets = exists
        ? prev.presets.filter((item) => item !== preset)
        : [...prev.presets, preset];
      return { ...prev, presets };
    });
  }, []);

  const filteredMeetings = useMemo(() => {
    const monthMeetings = meetingsByMonth.get(selectedMonth) || [];
    const matcher = createSynonymMatcher(filters.searchTerm);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfUpcomingWeek = new Date(startOfToday);
    endOfUpcomingWeek.setDate(endOfUpcomingWeek.getDate() + 7);

    const checkRoles = (meeting: MorningMeeting, rolesToCheck: RoleFilterKey[]) => {
      if (!hasUserIdentifiers) return false;
      return rolesToCheck.some((role) => {
        const fieldValue = normalizeValue(meeting[role]);
        if (!fieldValue) return false;
        return userIdentifiers.some((identifier) => fieldValue.includes(identifier));
      });
    };

    return monthMeetings.filter((meeting) => {
      if (
        !(
          matcher(meeting.title) ||
          matcher(meeting.lecturer) ||
          matcher(meeting.moderator) ||
          matcher(meeting.organizer)
        )
      ) {
        return false;
      }

      if (
        (filters.roles.length > 0 || filters.presets.includes('myMeetings')) &&
        !hasUserIdentifiers
      ) {
        return false;
      }

      if (filters.roles.length > 0 && !checkRoles(meeting, filters.roles)) {
        return false;
      }

      if (
        filters.presets.includes('myMeetings') &&
        !checkRoles(meeting, ['lecturer', 'moderator', 'organizer'])
      ) {
        return false;
      }

      if (filters.presets.includes('upcomingWeek')) {
        const meetingDate = meeting.date.toDate();
        if (meetingDate < startOfToday || meetingDate >= endOfUpcomingWeek) {
          return false;
        }
      }

      return true;
    });
  }, [
    filters,
    hasUserIdentifiers,
    meetingsByMonth,
    normalizeValue,
    selectedMonth,
    userIdentifiers,
  ]);

  const meetingsByWeek = useMemo(() => groupByWeek(filteredMeetings), [filteredMeetings]);

  const formatMonthTab = useCallback(
    (monthKey: string) => {
      const [year, month] = monthKey.split('-').map(Number);
      const date = new Date(year!, month!);
      return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
        month: 'long',
        year: 'numeric',
      });
    },
    [i18n.language],
  );

  const monthEntries = useMemo(() => {
    return Array.from(meetingsByMonth.keys()).map((monthKey) => {
      const [year, month] = monthKey.split('-').map(Number);
      return { key: monthKey, year: year!, month: month!, label: formatMonthTab(monthKey) };
    });
  }, [formatMonthTab, meetingsByMonth]);

  useEffect(() => {
    if (monthEntries.length === 0) {
      return;
    }
    if (!meetingsByMonth.has(selectedMonth)) {
      setSelectedMonth(monthEntries[0]!.key);
    }
  }, [meetingsByMonth, monthEntries, selectedMonth]);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    monthEntries.forEach((entry) => years.add(entry.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [monthEntries]);

  const [selectedYearRaw, selectedMonthIndexRaw] = selectedMonth.split('-').map(Number);
  const selectedYear = Number.isFinite(selectedYearRaw) ? selectedYearRaw : undefined;
  const selectedMonthIndex = Number.isFinite(selectedMonthIndexRaw)
    ? selectedMonthIndexRaw
    : undefined;

  const monthsForSelectedYear = useMemo(() => {
    const yearToUse = selectedYear ?? availableYears[0];
    if (yearToUse === undefined) {
      return [];
    }
    return monthEntries
      .filter((entry) => entry.year === yearToUse)
      .sort((a, b) => a.month - b.month);
  }, [availableYears, monthEntries, selectedYear]);

  const handleYearChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const newYear = Number(event.target.value);
      const monthsForYear = monthEntries
        .filter((entry) => entry.year === newYear)
        .sort((a, b) => a.month - b.month);
      if (monthsForYear.length > 0) {
        const existingForMonth =
          selectedMonthIndex !== undefined
            ? monthsForYear.find((entry) => entry.month === selectedMonthIndex)
            : undefined;
        setSelectedMonth((existingForMonth ?? monthsForYear[0])!.key);
      }
    },
    [monthEntries, selectedMonthIndex],
  );

  const handleMonthChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedMonth(event.target.value);
  }, []);

  // nextMeeting reserved for future enhancements

  return (
    <AppShell>
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
        <MorningMeetingFilters
          searchTerm={filters.searchTerm}
          onSearchChange={handleSearchChange}
          onClearSearch={handleClearSearch}
          activeRoleFilters={filters.roles}
          onToggleRole={toggleRoleFilter}
          activePresets={filters.presets}
          onTogglePreset={togglePresetFilter}
          roleFiltersAvailable={hasUserIdentifiers}
          userScopedPresetsAvailable={hasUserIdentifiers}
        />

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
            {monthEntries.length > 0 && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="morning-meetings-year"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t('morningMeetings.filters.year', { defaultValue: 'Year' })}
                    </label>
                    <select
                      id="morning-meetings-year"
                      value={selectedYear ?? availableYears[0] ?? ''}
                      onChange={handleYearChange}
                      className="rounded-md border border-muted bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface-elevated))]"
                    >
                      {availableYears.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label
                      htmlFor="morning-meetings-month"
                      className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
                    >
                      {t('morningMeetings.filters.month', { defaultValue: 'Month' })}
                    </label>
                    <select
                      id="morning-meetings-month"
                      value={selectedMonth}
                      onChange={handleMonthChange}
                      className="rounded-md border border-muted bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-[rgb(var(--border))] dark:bg-[rgb(var(--surface-elevated))]"
                    >
                      {monthsForSelectedYear.map((entry) => (
                        <option key={entry.key} value={entry.key}>
                          {entry.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
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
                {filters.searchTerm && (
                  <Button onClick={handleClearSearch} className="mt-4" variant="outline">
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
