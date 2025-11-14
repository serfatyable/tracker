import { useMemo } from 'react';

import type { OnCallShift, OnCallStats, StationKey } from '@/types/onCall';

/**
 * Calculates statistics for a list of on-call shifts
 * @param shifts - Array of on-call shifts
 * @returns Statistics object with counts and most common station
 */
export function useOnCallStats(shifts: OnCallShift[]): OnCallStats {
  return useMemo(() => {
    if (shifts.length === 0) {
      return {
        totalShifts: 0,
        mostCommonStation: null,
        stationCounts: {},
        upcomingShifts: shifts.length,
      };
    }

    // Count shifts by station
    const stationCounts: Partial<Record<StationKey, number>> = {};
    for (const shift of shifts) {
      const key = shift.stationKey;
      stationCounts[key] = (stationCounts[key] || 0) + 1;
    }

    // Find most common station
    let mostCommonStation: StationKey | null = null;
    let maxCount = 0;
    for (const [station, count] of Object.entries(stationCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonStation = station as StationKey;
      }
    }

    return {
      totalShifts: shifts.length,
      mostCommonStation,
      stationCounts,
      upcomingShifts: shifts.length,
    };
  }, [shifts]);
}
