/**
 * Constants for on-call schedule functionality
 */

/**
 * Default number of days ahead to show in future shifts
 */
export const DEFAULT_DAYS_AHEAD = 40;

/**
 * Maximum number of days to query from Firestore for upcoming shifts
 */
export const MAX_QUERY_DAYS = 120;

/**
 * Number of days to display in the timeline calendar view
 */
export const TIMELINE_DAYS_COUNT = 21;

/**
 * Timezone for on-call schedule (all shifts are in Israel time)
 */
export const ON_CALL_TIMEZONE = 'Asia/Jerusalem';

/**
 * Default shift start time (hour in 24h format)
 */
export const DEFAULT_SHIFT_START_HOUR = 8;

/**
 * Default shift end time (hour in 24h format)
 */
export const DEFAULT_SHIFT_END_HOUR = 16;
