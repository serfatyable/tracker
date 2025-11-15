import { toDateKey } from '../utils/dateUtils';

import type { OnCallShift } from '@/types/onCall';

/**
 * Types of shift conflicts
 */
export type ConflictType = 'multiple_same_day' | 'back_to_back' | 'none';

export interface ShiftConflict {
  type: ConflictType;
  message: string;
  severity: 'warning' | 'info';
}

/**
 * Detect if a shift has conflicts with other shifts
 */
export function detectShiftConflicts(
  shift: OnCallShift,
  allShifts: OnCallShift[],
): ShiftConflict | null {
  const shiftDateKey = shift.dateKey;

  // Check for multiple shifts on the same day
  const sameDayShifts = allShifts.filter((s) => s.dateKey === shiftDateKey);
  if (sameDayShifts.length > 1) {
    return {
      type: 'multiple_same_day',
      message: `Multiple shifts on ${shiftDateKey} (${sameDayShifts.length} stations)`,
      severity: 'warning',
    };
  }

  // Check for back-to-back shifts (consecutive days)
  const shiftDate = new Date(shift.date);
  const prevDay = new Date(shiftDate);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(shiftDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const prevDayKey = toDateKey(prevDay);
  const nextDayKey = toDateKey(nextDay);

  const hasPrevDayShift = allShifts.some((s) => s.dateKey === prevDayKey);
  const hasNextDayShift = allShifts.some((s) => s.dateKey === nextDayKey);

  if (hasPrevDayShift || hasNextDayShift) {
    const consecutiveDays = [hasPrevDayShift && prevDayKey, shiftDateKey, hasNextDayShift && nextDayKey]
      .filter(Boolean)
      .join(', ');

    return {
      type: 'back_to_back',
      message: `Back-to-back shifts: ${consecutiveDays}`,
      severity: 'info',
    };
  }

  return null;
}

/**
 * Get all shifts with conflicts
 */
export function getShiftsWithConflicts(shifts: OnCallShift[]): Map<string, ShiftConflict> {
  const conflictsMap = new Map<string, ShiftConflict>();

  for (const shift of shifts) {
    const conflict = detectShiftConflicts(shift, shifts);
    if (conflict) {
      conflictsMap.set(shift.dateKey, conflict);
    }
  }

  return conflictsMap;
}

/**
 * Get conflict badge classes based on severity
 */
export function getConflictBadgeClasses(severity: 'warning' | 'info'): string {
  if (severity === 'warning') {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700';
  }
  return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 border border-blue-300 dark:border-blue-700';
}
