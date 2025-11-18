'use client';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useCurrentUserProfile } from '@/lib/react-query/hooks';
import { createSynonymMatcher } from '../../../lib/search/synonyms';
import { CardSkeleton } from '../../dashboard/Skeleton';
import Badge from '../../ui/Badge';
import Button from '../../ui/Button';
import Input from '../../ui/Input';

import AdminAnalytics from './AdminAnalytics';
import { ALLOWED_SHIFT_TYPES, getShiftConfig } from './shiftConfig';

interface OnCallScheduleViewProps {
  showUploadButton?: boolean;
  currentUserId?: string;
}

const OnCallScheduleView = memo(function OnCallScheduleView({
  showUploadButton = false,
}: OnCallScheduleViewProps) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { data: currentUser } = useCurrentUserProfile();
  const [searchTerm, setSearchTerm] = useState('');
  const [myShiftsOnly, setMyShiftsOnly] = useState(false);
  const [shiftTypeFilter, setShiftTypeFilter] = useState<string[]>([]);
  const [residentFilter, _setResidentFilter] = useState('');
  const [showCalendarView, setShowCalendarView] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });

  // Fetch schedule for multiple months
  const [allSchedule, setAllSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { getFirestore } = await import('firebase/firestore');
        const { collection, query, where, orderBy, getDocs } = await import('firebase/firestore');
        const { getFirebaseApp } = await import('../../../lib/firebase/client');

        const db = getFirestore(getFirebaseApp());

        // Get schedule from 3 months ago to 6 months ahead
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 6);

        const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;
        const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-31`;

        const q = query(
          collection(db, 'onCallDays'),
          where('dateKey', '>=', startKey),
          where('dateKey', '<=', endKey),
          orderBy('dateKey', 'asc'),
        );

        const snapshot = await getDocs(q);
        const schedule = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            date: data.date.toDate(),
            dateKey: data.dateKey,
            dayOfWeek: data.dayOfWeek,
            // flatten stations to shift-type label map for UI compatibility
            shifts: Object.fromEntries(
              Object.entries(data.stations || {}).map(([stationKey, entry]: any) => [
                stationKey,
                entry.userDisplayName,
              ]),
            ),
            stations: data.stations || {},
          } as any;
        });

        setAllSchedule(schedule);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
        setLoading(false);
      }
    })();
  }, []);

  // Get today's team
  const todaysTeam = useMemo(() => {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return allSchedule.find((day) => day.dateKey === todayKey);
  }, [allSchedule]);

  // Get unique shift types and residents (filtered by allowed types)
  const { uniqueShiftTypes, uniqueResidents: _uniqueResidents } = useMemo(() => {
    const shiftTypes = new Set<string>();
    const residents = new Set<string>();

    allSchedule.forEach((day) => {
      Object.entries(day.shifts).forEach(([type, name]) => {
        // Include if it's in allowed list OR contains any of the allowed keywords
        const isAllowed = ALLOWED_SHIFT_TYPES.some(
          (allowedType) =>
            type === allowedType ||
            type.includes(allowedType) ||
            allowedType.includes(type) ||
            type.toLowerCase().includes(allowedType.toLowerCase()) ||
            allowedType.toLowerCase().includes(type.toLowerCase()),
        );

        if (isAllowed) {
          shiftTypes.add(type);
        }
        residents.add(String(name));
      });
    });

    return {
      uniqueShiftTypes: Array.from(shiftTypes).sort(),
      uniqueResidents: Array.from(residents).sort(),
    };
  }, [allSchedule]);

  // Group by month
  const scheduleByMonth = useMemo(() => {
    const groups = new Map<string, typeof allSchedule>();
    allSchedule.forEach((day) => {
      const date = day.date;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(day);
    });

    return new Map(
      Array.from(groups.entries()).sort((a, b) => {
        const [yearA, monthA] = a[0].split('-').map(Number);
        const [yearB, monthB] = b[0].split('-').map(Number);
        return yearA! - yearB! || monthA! - monthB!;
      }),
    );
  }, [allSchedule]);

  // Calculate statistics
  const stats = useMemo(() => {
    const _userId = currentUser?.uid || '';
    let totalShifts = 0;
    let myShifts = 0;
    const shiftTypeCounts: Record<string, number> = {};
    const residentShiftCounts: Record<string, number> = {};
    const weekendShifts: Record<string, number> = {};

    allSchedule.forEach((day) => {
      const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
      Object.entries(day.shifts).forEach(([type, name]) => {
        totalShifts++;
        shiftTypeCounts[type] = (shiftTypeCounts[type] || 0) + 1;
        const residentName = String(name);
        residentShiftCounts[residentName] = (residentShiftCounts[residentName] || 0) + 1;

        if (isWeekend) {
          weekendShifts[residentName] = (weekendShifts[residentName] || 0) + 1;
        }
      });
    });

    const mostCommonShift = Object.entries(shiftTypeCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalShifts,
      myShifts,
      mostCommonShift: mostCommonShift ? `${mostCommonShift[0]} (${mostCommonShift[1]})` : 'N/A',
      shiftTypeCounts,
      residentShiftCounts,
      weekendShifts,
    };
  }, [allSchedule, currentUser]);

  // Filter by search, my shifts, shift type, and resident
  const filteredSchedule = useMemo(() => {
    const monthSchedule = scheduleByMonth.get(selectedMonth) || [];
    const matcher = createSynonymMatcher(searchTerm);
    const residentMatcher = createSynonymMatcher(residentFilter);
    const hasSearch = searchTerm.trim().length > 0;
    const hasResidentFilter = residentFilter.trim().length > 0;

    return monthSchedule.filter((day) => {
      // My shifts filter
      if (myShiftsOnly && currentUser?.uid) {
        const stations = (day.stations || {}) as Record<
          string,
          { userId: string; userDisplayName: string }
        >;
        const hasMyShift = Object.values(stations).some((e) => e.userId === currentUser.uid);
        if (!hasMyShift) return false;
      }

      // Shift type filter
      if (shiftTypeFilter.length > 0) {
        const hasMatchingType = Object.keys(day.shifts).some((type) =>
          shiftTypeFilter.some((filter) => type.toUpperCase().includes(filter.toUpperCase())),
        );
        if (!hasMatchingType) return false;
      }

      // Resident filter
      if (hasResidentFilter) {
        const hasResident = Object.values(day.shifts).some((name: any) =>
          residentMatcher(String(name)),
        );
        if (!hasResident) return false;
      }

      // Search filter
      if (hasSearch) {
        return Object.values(day.shifts).some((name: any) => matcher(String(name)));
      }

      return true;
    });
  }, [
    scheduleByMonth,
    selectedMonth,
    searchTerm,
    myShiftsOnly,
    shiftTypeFilter,
    residentFilter,
    currentUser,
  ]);

  // Group schedule by day for calendar view
  const scheduleByDay = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const allMonthSchedule = scheduleByMonth.get(selectedMonth) || [];
    const daysInMonth = new Date(year!, month! + 1, 0).getDate();

    const map: Record<number, any> = {};
    allMonthSchedule.forEach((day) => {
      const d = day.date.getDate();
      map[d] = day;
    });

    return { daysInMonth, map };
  }, [scheduleByMonth, selectedMonth]);

  // Format month for tabs
  const formatMonthTab = (monthKey: string) => {
    const [year, month] = monthKey.split('-').map(Number);
    const date = new Date(year!, month!);
    return date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Scroll to specific day
  const scrollToDay = (day: number) => {
    setShowCalendarView(false);
    setTimeout(() => {
      const element = document.getElementById(`oncall-day-${day}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50');
        setTimeout(() => {
          element.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50');
        }, 2000);
      }
    }, 100);
  };

  const getMonthColor = (month: number) => {
    const colors = [
      'bg-blue-50 dark:bg-blue-950/30',
      'bg-green-50 dark:bg-green-950/30',
      'bg-purple-50 dark:bg-purple-950/30',
      'bg-orange-50 dark:bg-orange-950/30',
      'bg-pink-50 dark:bg-pink-950/30',
      'bg-teal-50 dark:bg-teal-950/30',
      'bg-indigo-50 dark:bg-indigo-950/30',
      'bg-yellow-50 dark:bg-yellow-950/30',
      'bg-red-50 dark:bg-red-950/30',
      'bg-cyan-50 dark:bg-cyan-950/30',
      'bg-lime-50 dark:bg-lime-950/30',
      'bg-amber-50 dark:bg-amber-950/30',
    ];
    return colors[month] || colors[0];
  };

  const getMonthBorderColor = (month: number) => {
    const borders = [
      'border-l-4 border-blue-400',
      'border-l-4 border-green-400',
      'border-l-4 border-purple-400',
      'border-l-4 border-orange-400',
      'border-l-4 border-pink-400',
      'border-l-4 border-teal-400',
      'border-l-4 border-indigo-400',
      'border-l-4 border-yellow-400',
      'border-l-4 border-red-400',
      'border-l-4 border-cyan-400',
      'border-l-4 border-lime-400',
      'border-l-4 border-amber-400',
    ];
    return borders[month] || borders[0];
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (scheduleByMonth.size === 0) {
    return (
      <div className="card-levitate p-12 text-center">
        <div className="text-4xl mb-4">📅</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          {t('onCall.noSchedule', { defaultValue: 'No schedule uploaded' })}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {showUploadButton
            ? 'Upload an Excel file to add on-call assignments'
            : 'No on-call schedule is currently available'}
        </p>
        {showUploadButton && (
          <Button
            onClick={() => router.push('/admin/on-call')}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            📤 Upload Schedule
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Today's Team Hero Card */}
      {todaysTeam && (
        <div className="card-levitate p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-300 dark:border-blue-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {t('onCall.todaysTeam', { defaultValue: "Today's On-Call Team" })}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {new Date().toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(todaysTeam.shifts)
              .filter(([shiftType, residentName]) => {
                // Filter by shift type if filter is active
                if (shiftTypeFilter.length > 0) {
                  const matchesFilter = shiftTypeFilter.some(
                    (filter) =>
                      shiftType.toUpperCase().includes(filter.toUpperCase()) ||
                      filter.toUpperCase().includes(shiftType.toUpperCase()),
                  );
                  if (!matchesFilter) return false;
                }

                // Filter by my shifts if active
                if (myShiftsOnly && currentUser?.fullName) {
                  if (!String(residentName).includes(currentUser.fullName)) return false;
                }

                return true;
              })
              .map(([shiftType, residentName]) => {
                const config = getShiftConfig(shiftType);
                const isMyShift =
                  currentUser?.fullName && String(residentName).includes(currentUser.fullName);
                return (
                  <div
                    key={shiftType}
                    className={`p-3 rounded-lg border-2 ${config.bgColor} ${config.borderColor} ${isMyShift ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{config.icon}</span>
                      <span className={`font-semibold text-sm ${config.color}`}>{shiftType}</span>
                      {isMyShift && <Badge className="bg-green-600 text-white text-xs">You</Badge>}
                    </div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {String(residentName)}
                    </div>
                    <a
                      href={`tel:${String(residentName)}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 mt-1"
                    >
                      <span>📞</span> Call
                    </a>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Quick Stats Card */}
      {!showUploadButton && stats.myShifts > 0 && (
        <div className="card-levitate p-4 bg-gradient-to-r from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 border border-green-200 dark:border-green-800">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {stats.myShifts}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('onCall.yourShifts', { defaultValue: 'Your Shifts' })}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.totalShifts}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('onCall.totalShifts', { defaultValue: 'Total Shifts' })}
              </div>
            </div>
            <div className="col-span-2">
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                {stats.mostCommonShift}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('onCall.mostCommon', { defaultValue: 'Most Common' })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Analytics */}
      {showUploadButton && <AdminAnalytics stats={stats} />}

      {/* Header with Upload, Filters, Calendar Export, and Search */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex gap-2 flex-wrap">
            {showUploadButton && (
              <>
                <Button
                  onClick={() => router.push('/admin/on-call')}
                  className="btn-levitate border-blue-400 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-600 dark:bg-blue-950/30 dark:text-blue-300"
                  variant="outline"
                >
                  📤 {t('onCall.import.uploadExcel', { defaultValue: 'Upload Schedule' })}
                </Button>
                <Button
                  onClick={() => router.push('/admin/on-call/manual')}
                  className="btn-levitate border-green-400 bg-green-50 hover:bg-green-100 text-green-700 dark:border-green-600 dark:bg-green-950/30 dark:text-green-300"
                  variant="outline"
                >
                  ✏️ {t('onCall.manualEntry', { defaultValue: 'Manual Entry' })}
                </Button>
              </>
            )}

            {/* My Shifts Toggle */}
            {currentUser && (
              <Button
                onClick={() => setMyShiftsOnly(!myShiftsOnly)}
                className={`btn-levitate ${myShiftsOnly ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300' : 'border-gray-300 text-gray-700 dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]'}`}
                variant="outline"
              >
                <span className="mr-1">👤</span>
                {t('onCall.myShiftsOnly', { defaultValue: 'My Shifts' })}
                {myShiftsOnly && stats.myShifts > 0 && (
                  <Badge className="ml-2 bg-green-600 text-white">{stats.myShifts}</Badge>
                )}
              </Button>
            )}

            {/* Calendar View Toggle */}
            <Button
              onClick={() => setShowCalendarView(!showCalendarView)}
              className={`btn-levitate ${showCalendarView ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300' : 'border-gray-300 text-gray-700 dark:border-[rgb(var(--border))] dark:text-[rgb(var(--fg))]'}`}
              variant="outline"
            >
              📅{' '}
              {showCalendarView
                ? t('ui.listView', { defaultValue: 'List View' })
                : t('ui.calendarView', { defaultValue: 'Calendar View' })}
            </Button>
          </div>

          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Input
              type="text"
              placeholder={t('ui.search', { defaultValue: 'Search' }) + '...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-48"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-2"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Calendar Export */}
        {currentUser && (
          <div className="card-levitate p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-xl">📅</span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {t('onCall.exportToCalendar', { defaultValue: 'Export to Calendar' })}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {t('onCall.exportDescription', {
                      defaultValue: 'Subscribe to get your shifts in your calendar app',
                    })}
                  </p>
                </div>
              </div>

              <a
                href="/api/ics/on-call?personal=true"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 rounded-lg text-white transition-all shadow-sm hover:shadow-md font-medium"
              >
                <span className="text-sm">👤</span>
                <span className="text-sm">
                  {t('onCall.exportMyShifts', { defaultValue: 'My Shifts Calendar' })}
                </span>
              </a>
            </div>
          </div>
        )}

        {/* Multi-Filter System */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Shift Type Filter */}
          {uniqueShiftTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {t('onCall.shiftType', { defaultValue: 'Shift Type' })}:
              </span>
              {uniqueShiftTypes.map((type) => {
                const config = getShiftConfig(type);
                const isActive = shiftTypeFilter.includes(type);
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setShiftTypeFilter((prev) =>
                        isActive ? prev.filter((t) => t !== type) : [...prev, type],
                      );
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-medium transition-all ${
                      isActive
                        ? `${config.bgColor} ${config.borderColor} border-2 ${config.color}`
                        : 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))] text-gray-600 dark:text-[rgb(var(--muted))] border border-gray-300 dark:border-[rgb(var(--border))]'
                    }`}
                  >
                    <span className="mr-1">{config.icon}</span>
                    {type}
                  </button>
                );
              })}
              {shiftTypeFilter.length > 0 && (
                <button
                  onClick={() => setShiftTypeFilter([])}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Month tabs */}
      <div className="border-b border-gray-200 dark:border-[rgb(var(--border))] -mx-2 px-2">
        <div className="flex overflow-x-auto gap-2 pb-2">
          {Array.from(scheduleByMonth.keys()).map((monthKey) => {
            const count = scheduleByMonth.get(monthKey)?.length || 0;
            const [year, month] = monthKey.split('-').map(Number);
            const isCurrentMonth = monthKey === selectedMonth;
            const now = new Date();
            const isTodaysMonth = year === now.getFullYear() && month === now.getMonth();

            return (
              <button
                key={monthKey}
                onClick={() => setSelectedMonth(monthKey)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-all
                  ${
                    isCurrentMonth
                      ? 'bg-blue-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-[rgb(var(--surface-elevated))] text-gray-700 dark:text-[rgb(var(--fg))] hover:bg-gray-200 dark:hover:bg-[rgb(var(--surface-depressed))]'
                  }
                `}
              >
                {isTodaysMonth && <span className="text-xs">📍</span>}
                <span className="font-medium">{formatMonthTab(monthKey)}</span>
                <span
                  className={`
                  text-xs px-2 py-0.5 rounded-full
                  ${
                    isCurrentMonth
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }
                `}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar Grid View */}
      {showCalendarView && (
        <div className="card-levitate p-4">
          <div className="mb-3 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <span>📅</span>
            {t('onCall.monthOverview', { defaultValue: 'Month Overview' })}
          </div>
          <div className="grid grid-cols-7 gap-2 text-sm">
            {/* Day headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-gray-500 dark:text-gray-400 py-1"
              >
                {t(`common.days.${day.toLowerCase()}`, { defaultValue: day })}
              </div>
            ))}

            {/* Calendar days */}
            {Array.from({ length: scheduleByDay.daysInMonth }, (_, i) => i + 1).map((d) => {
              const daySchedule = scheduleByDay.map[d];
              const isToday = (() => {
                const today = new Date();
                const [year, month] = selectedMonth.split('-').map(Number);
                return (
                  today.getDate() === d &&
                  today.getMonth() === month &&
                  today.getFullYear() === year
                );
              })();

              // Calculate shift count based on filters
              const shiftCount = daySchedule
                ? Object.entries(daySchedule.shifts).filter(([type, name]) => {
                    if (shiftTypeFilter.length > 0) {
                      const matchesFilter = shiftTypeFilter.some(
                        (filter) =>
                          type.toUpperCase().includes(filter.toUpperCase()) ||
                          filter.toUpperCase().includes(type.toUpperCase()),
                      );
                      if (!matchesFilter) return false;
                    }
                    {
                      const myName = currentUser?.fullName ?? '';
                      if (myShiftsOnly && myName) {
                        const displayName = typeof name === 'string' ? name : '';
                        if (!displayName.includes(myName)) return false;
                      }
                    }
                    return true;
                  }).length
                : 0;

              const myUid = currentUser?.uid ?? '';
              const hasMyShift = !!(
                daySchedule &&
                myUid &&
                Object.entries(daySchedule.stations || {}).some(([type, entry]: any) => {
                  if (shiftTypeFilter.length > 0) {
                    const matchesFilter = shiftTypeFilter.some(
                      (filter) =>
                        type.toUpperCase().includes(filter.toUpperCase()) ||
                        filter.toUpperCase().includes(type.toUpperCase()),
                    );
                    if (!matchesFilter) return false;
                  }
                  return entry && entry.userId === myUid;
                })
              );

              return (
                <div
                  key={d}
                  onClick={() => shiftCount > 0 && scrollToDay(d)}
                  className={`
                    rounded-lg border p-2 min-h-[80px] transition-all hover:shadow-md hover:scale-105
                    ${shiftCount > 0 ? 'cursor-pointer' : 'cursor-default'}
                    ${
                      isToday
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-opacity-50'
                        : 'border-gray-200 dark:border-[rgb(var(--border))] hover:border-gray-300 dark:hover:border-[rgb(var(--border-strong))]'
                    }
                    ${hasMyShift ? 'ring-2 ring-green-500 ring-opacity-30' : ''}
                  `}
                  title={
                    shiftCount > 0
                      ? t('onCall.clickToView', { defaultValue: 'Click to view details' })
                      : ''
                  }
                >
                  <div
                    className={`
                    text-xs font-medium mb-1 flex items-center justify-between
                    ${isToday ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}
                  `}
                  >
                    <span>{d}</span>
                    {isToday && (
                      <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px]">
                        •
                      </span>
                    )}
                  </div>
                  {daySchedule && (
                    <div className="space-y-1">
                      {Object.entries(daySchedule.shifts)
                        .filter(([type]) => {
                          // Filter by shift type if filter is active
                          if (shiftTypeFilter.length > 0) {
                            const matchesFilter = shiftTypeFilter.some(
                              (filter) =>
                                type.toUpperCase().includes(filter.toUpperCase()) ||
                                filter.toUpperCase().includes(type.toUpperCase()),
                            );
                            if (!matchesFilter) return false;
                          }

                          // Filter by my shifts if active
                          if (myShiftsOnly && currentUser?.uid) {
                            const stations = (daySchedule.stations || {}) as Record<
                              string,
                              { userId: string; userDisplayName: string }
                            >;
                            const entry = stations[type];
                            if (!entry || entry.userId !== currentUser.uid) return false;
                          }

                          return true;
                        })
                        .slice(0, 3)
                        .map(([type, name]) => {
                          const config = getShiftConfig(type);
                          return (
                            <div
                              key={type}
                              className={`truncate text-xs p-1 rounded ${config.bgColor} border-l-2 ${config.borderColor.replace('border-', 'border-l-')}`}
                              title={`${type}: ${String(name)}`}
                            >
                              <span className="mr-1">{config.icon}</span>
                              {String(name).split(' ')[0]}
                            </div>
                          );
                        })}
                      {(() => {
                        const filteredCount = Object.entries(daySchedule.shifts).filter(
                          ([type, name]) => {
                            if (shiftTypeFilter.length > 0) {
                              const matchesFilter = shiftTypeFilter.some(
                                (filter) =>
                                  type.toUpperCase().includes(filter.toUpperCase()) ||
                                  filter.toUpperCase().includes(type.toUpperCase()),
                              );
                              if (!matchesFilter) return false;
                            }
                            if (myShiftsOnly && currentUser?.fullName) {
                              if (!String(name).includes(currentUser.fullName)) return false;
                            }
                            return true;
                          },
                        ).length;
                        return (
                          filteredCount > 3 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                              +{filteredCount - 3} more
                            </div>
                          )
                        );
                      })()}
                    </div>
                  )}
                  {!daySchedule && (
                    <div className="text-xs text-gray-400 dark:text-gray-600 italic">
                      {t('common.noShifts', { defaultValue: '-' })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Schedule list */}
      {filteredSchedule.length === 0 ? (
        <div className="card-levitate p-8 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <p className="text-gray-500 dark:text-gray-400">
            {searchTerm || myShiftsOnly || shiftTypeFilter.length > 0
              ? t('ui.noResults', { defaultValue: 'No results found' })
              : t('onCall.noScheduleThisMonth', { defaultValue: 'No schedule for this month' })}
          </p>
          {(myShiftsOnly || shiftTypeFilter.length > 0) && (
            <Button
              onClick={() => {
                setMyShiftsOnly(false);
                setShiftTypeFilter([]);
                setSearchTerm('');
              }}
              className="mt-4"
              variant="outline"
            >
              {t('ui.clearFilters', { defaultValue: 'Clear filters' })}
            </Button>
          )}
        </div>
      ) : (
        !showCalendarView && (
          <div className="space-y-2">
            {filteredSchedule.map((day: any) => {
              const date = day.date;
              const monthColor = getMonthColor(date.getMonth());
              const borderColor = getMonthBorderColor(date.getMonth());

              return (
                <div
                  key={day.id}
                  id={`oncall-day-${date.getDate()}`}
                  className={`card-levitate p-4 ${monthColor} ${borderColor} hover:shadow-lg transition-all scroll-mt-24`}
                >
                  <div className="flex gap-4">
                    {/* Date badge */}
                    <div className="flex-shrink-0 w-16 text-center">
                      <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg py-2 shadow-md">
                        <div className="text-xs font-medium">{day.dayOfWeek || ''}</div>
                        <div className="text-2xl font-bold">{date.getDate()}</div>
                        <div className="text-xs">
                          {date.toLocaleDateString(i18n.language === 'he' ? 'he-IL' : 'en-US', {
                            month: 'short',
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Grid of all shift assignments */}
                    <div className="flex-1 min-w-0">
                      <div className="overflow-x-container">
                        <div className="min-w-content grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {Object.entries(day.shifts)
                            .filter(([shiftType, residentName]) => {
                              // Filter by shift type if filter is active
                              if (shiftTypeFilter.length > 0) {
                                const matchesFilter = shiftTypeFilter.some(
                                  (filter) =>
                                    shiftType.toUpperCase().includes(filter.toUpperCase()) ||
                                    filter.toUpperCase().includes(shiftType.toUpperCase()),
                                );
                                if (!matchesFilter) return false;
                              }

                              // Filter by my shifts if active
                              if (myShiftsOnly && currentUser?.fullName) {
                                if (!String(residentName).includes(currentUser.fullName))
                                  return false;
                              }

                              return true;
                            })
                            .map(([shiftType, residentName]) => {
                              const config = getShiftConfig(shiftType);
                              const isMyShift = !!(
                                currentUser?.uid &&
                                day.stations?.[shiftType]?.userId === currentUser.uid
                              );
                              return (
                                <div
                                  key={shiftType}
                                  className={`p-3 rounded-lg border-2 ${config.bgColor} ${config.borderColor} ${isMyShift ? 'ring-2 ring-green-500 ring-offset-2' : ''}`}
                                >
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{config.icon}</span>
                                    <span className={`font-semibold text-xs ${config.color}`}>
                                      {shiftType}
                                    </span>
                                    {isMyShift && (
                                      <Badge className="bg-green-600 text-white text-xs">You</Badge>
                                    )}
                                  </div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                                    {String(residentName)}
                                  </div>
                                  <a
                                    href={`tel:${String(residentName)}`}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>📞</span> Call
                                  </a>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
});

export default OnCallScheduleView;
