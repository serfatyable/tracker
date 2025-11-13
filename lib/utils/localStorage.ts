/**
 * Safe localStorage utilities with SSR support
 */

/**
 * Check if localStorage is available (handles SSR)
 */
export function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage !== null;
  } catch {
    return false;
  }
}

/**
 * Get item from localStorage with fallback
 */
export function getLocalStorageItem<T>(key: string, defaultValue: T): T {
  if (!isLocalStorageAvailable()) return defaultValue;

  try {
    const item = window.localStorage.getItem(key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to get localStorage item "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Set item in localStorage
 */
export function setLocalStorageItem<T>(key: string, value: T): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to set localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Remove item from localStorage
 */
export function removeLocalStorageItem(key: string): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove localStorage item "${key}":`, error);
    return false;
  }
}

/**
 * Clear all localStorage items with a specific prefix
 */
export function clearLocalStorageByPrefix(prefix: string): boolean {
  if (!isLocalStorageAvailable()) return false;

  try {
    const keys = Object.keys(window.localStorage);
    keys.forEach((key) => {
      if (key.startsWith(prefix)) {
        window.localStorage.removeItem(key);
      }
    });
    return true;
  } catch (error) {
    console.warn(`Failed to clear localStorage with prefix "${prefix}":`, error);
    return false;
  }
}

/**
 * On-call specific localStorage keys
 */
export const ONCALL_STORAGE_KEYS = {
  TAB: 'oncall:tab',
  MINI_CALENDAR_START: 'oncall:miniCalendar:start',
  MINI_CALENDAR_STATION_FILTER: 'oncall:miniCalendar:stationFilter',
  MINI_CALENDAR_DOCTOR_FILTER: 'oncall:miniCalendar:doctorFilter',
  TEAM_DATE: 'oncall:teamDate',
  COLOR_LEGEND_EXPANDED: 'oncall:colorLegend:expanded',
} as const;
