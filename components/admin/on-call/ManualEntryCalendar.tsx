'use client';
import { memo, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

import { getFirebaseApp } from '@/lib/firebase/client';
import type { StationsMap } from '@/types/onCall';
import Button from '@/components/ui/Button';
import { CardSkeleton } from '@/components/dashboard/Skeleton';

import EditDayPanel from './EditDayPanel';

interface DayData {
  dateKey: string;
  date: Date;
  stations: StationsMap;
}

const ManualEntryCalendar = memo(function ManualEntryCalendar() {
  const { t, i18n } = useTranslation();
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}`;
  });
  const [allSchedule, setAllSchedule] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  // Fetch schedule data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const db = getFirestore(getFirebaseApp());

        // Get schedule from 3 months ago to 12 months ahead
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 12);

        const startKey = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}-01`;
        const endKey = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-31`;

        const q = query(
          collection(db, 'onCallDays'),
          where('dateKey', '>=', startKey),
          where('dateKey', '<=', endKey),
          orderBy('dateKey', 'asc'),
        );

        const snapshot = await getDocs(q);
        const schedule: DayData[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            dateKey: data.dateKey,
            date: data.date.toDate(),
            stations: data.stations || {},
          };
        });

        setAllSchedule(schedule);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch schedule:', error);
        setLoading(false);
      }
    })();
  }, []);

  // Group by month
  const scheduleByMonth = useMemo(() => {
    const groups = new Map<string, DayData[]>();
    allSchedule.forEach((day) => {
      const date = day.date;
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(day);
    });

    // Add empty month groups for future months
    const now = new Date();
    for (let i = -3; i <= 12; i++) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${monthDate.getFullYear()}-${monthDate.getMonth()}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
    }

    return new Map(
      Array.from(groups.entries()).sort((a, b) => {
        const [yearA, monthA] = a[0].split('-').map(Number);
        const [yearB, monthB] = b[0].split('-').map(Number);
        return yearA! - yearB! || monthA! - monthB!;
      }),
    );
  }, [allSchedule]);

  // Get calendar data for selected month
  const calendarData = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthSchedule = scheduleByMonth.get(selectedMonth) || [];

    const daysInMonth = new Date(year!, month! + 1, 0).getDate();
    const firstDayOfWeek = new Date(year!, month!, 1).getDay();

    const map: Record<number, DayData | undefined> = {};
    monthSchedule.forEach((day) => {
      const d = day.date.getDate();
      map[d] = day;
    });

    return { daysInMonth, firstDayOfWeek, map };
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

  // Get date key for a specific day
  const getDateKeyForDay = (day: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return `${year}-${String(month! + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  // Handle date click
  const handleDateClick = (day: number) => {
    const dateKey = getDateKeyForDay(day);
    setSelectedDateKey(dateKey);
  };

  // Handle panel close
  const handlePanelClose = () => {
    setSelectedDateKey(null);
  };

  // Navigate to prev/next day
  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!selectedDateKey) return;

    const [year, month, day] = selectedDateKey.split('-').map(Number);
    const currentDate = new Date(year!, month! - 1, day!);

    if (direction === 'prev') {
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const newDateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    setSelectedDateKey(newDateKey);

    // Update selected month if we crossed a month boundary
    const newMonthKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}`;
    if (newMonthKey !== selectedMonth) {
      setSelectedMonth(newMonthKey);
    }
  };

  // Get selected day data
  const selectedDayData = useMemo(() => {
    if (!selectedDateKey) return null;

    const existing = allSchedule.find((d) => d.dateKey === selectedDateKey);
    if (existing) return existing;

    // Create empty day data for new dates
    const [year, month, day] = selectedDateKey.split('-').map(Number);
    return {
      dateKey: selectedDateKey,
      date: new Date(year!, month! - 1, day!),
      stations: {},
    };
  }, [selectedDateKey, allSchedule]);

  const canNavigatePrev = true; // Always allow navigation
  const canNavigateNext = true;

  if (loading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info card */}
      <div className="card-levitate p-6 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-2 border-blue-300 dark:border-blue-700">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-2xl">✏️</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {t('onCall.manualEntry', { defaultValue: 'Manual On-Call Entry' })}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t('onCall.manualEntryDescription', {
                defaultValue: 'Click any date to add or edit on-call assignments',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Month tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
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
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                `}
              >
                {isTodaysMonth && <span className="text-xs">📍</span>}
                <span className="font-medium">{formatMonthTab(monthKey)}</span>
                {count > 0 && (
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
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card-levitate p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {formatMonthTab(selectedMonth)}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('onCall.clickDateToEdit', { defaultValue: 'Click a date to add or edit assignments' })}
          </p>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div
              key={day}
              className="text-center text-sm font-semibold text-gray-600 dark:text-gray-400 py-2"
            >
              {t(`common.days.${day.toLowerCase()}`, { defaultValue: day })}
            </div>
          ))}

          {/* Empty cells for days before month starts */}
          {Array.from({ length: calendarData.firstDayOfWeek }, (_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Calendar days */}
          {Array.from({ length: calendarData.daysInMonth }, (_, i) => i + 1).map((day) => {
            const dayData = calendarData.map[day];
            const dateKey = getDateKeyForDay(day);
            const [year, month, dayNum] = dateKey.split('-').map(Number);

            const isToday = (() => {
              const today = new Date();
              return (
                today.getDate() === day &&
                today.getMonth() === month! - 1 &&
                today.getFullYear() === year
              );
            })();

            const assignedCount = dayData ? Object.keys(dayData.stations).length : 0;

            return (
              <button
                key={day}
                onClick={() => handleDateClick(day)}
                className={`
                  aspect-square rounded-lg border-2 p-3 transition-all hover:shadow-lg hover:scale-105 cursor-pointer
                  ${
                    isToday
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-2 ring-blue-500 ring-opacity-50'
                      : assignedCount > 0
                        ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }
                `}
              >
                <div className="flex flex-col h-full">
                  <div
                    className={`text-lg font-bold mb-1 ${
                      isToday
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </div>
                  {assignedCount > 0 && (
                    <div className="mt-auto">
                      <div className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2 py-1 rounded">
                        {assignedCount} {t('onCall.shifts', { defaultValue: 'shifts' })}
                      </div>
                    </div>
                  )}
                  {assignedCount === 0 && (
                    <div className="mt-auto">
                      <div className="text-xs text-gray-400 dark:text-gray-600">
                        {t('onCall.clickToAdd', { defaultValue: 'Click to add' })}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Edit day panel */}
      {selectedDayData && (
        <EditDayPanel
          isOpen={!!selectedDateKey}
          onClose={handlePanelClose}
          dateKey={selectedDayData.dateKey}
          initialStations={selectedDayData.stations}
          onNavigate={handleNavigate}
          canNavigatePrev={canNavigatePrev}
          canNavigateNext={canNavigateNext}
          allScheduleData={allSchedule}
        />
      )}
    </div>
  );
});

export default ManualEntryCalendar;
