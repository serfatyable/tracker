/**
 * Date utility functions for on-call schedule management
 */

/**
 * Converts a Date to a date key string in YYYY-MM-DD format
 * @param date - The date to convert
 * @returns Date key string (e.g., "2025-11-13")
 */
export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/**
 * Parses a date key string to a Date object
 * @param dateKey - The date key string in YYYY-MM-DD format
 * @returns Date object
 */
export function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map((p) => parseInt(p, 10));
  return new Date(year, month - 1, day);
}

/**
 * Adds a number of days to a date
 * @param date - The base date
 * @param days - Number of days to add (can be negative)
 * @returns New Date object
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Gets the current date key for Asia/Jerusalem timezone
 * @returns Current date key in Asia/Jerusalem timezone
 */
export function getTodayDateKey(): string {
  const tz = 'Asia/Jerusalem';
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date());
}

/**
 * Formats a date according to the user's locale
 * @param date - The date to format
 * @param locale - The locale to use (e.g., 'en', 'he')
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateLocale(
  date: Date,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  };
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', defaultOptions).format(date);
}

/**
 * Formats a date with time according to the user's locale
 * @param date - The date to format
 * @param locale - The locale to use (e.g., 'en', 'he')
 * @param timezone - The timezone to display (default: 'Asia/Jerusalem')
 * @returns Formatted date and time string
 */
export function formatDateTimeLocale(
  date: Date,
  locale: string,
  timezone: string = 'Asia/Jerusalem',
): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
  };
  return new Intl.DateTimeFormat(locale === 'he' ? 'he-IL' : 'en-US', options).format(date);
}

/**
 * Gets the start and end date keys for a range
 * @param startDate - The start date
 * @param daysAhead - Number of days ahead
 * @returns Object with startKey and endKey
 */
export function getDateRange(startDate: Date, daysAhead: number): { startKey: string; endKey: string } {
  const endDate = addDays(startDate, Math.max(0, daysAhead));
  return {
    startKey: toDateKey(startDate),
    endKey: toDateKey(endDate),
  };
}

/**
 * Checks if a date is today in Asia/Jerusalem timezone
 * @param dateKey - The date key to check
 * @returns True if the date is today
 */
export function isToday(dateKey: string): boolean {
  return dateKey === getTodayDateKey();
}

/**
 * Gets a human-readable relative date description
 * @param dateKey - The date key
 * @param locale - The locale to use
 * @returns Relative date string (e.g., "Today", "Tomorrow", or the actual date)
 */
export function getRelativeDateLabel(dateKey: string, locale: string, t: (key: string) => string): string {
  const today = getTodayDateKey();
  const tomorrow = toDateKey(addDays(new Date(), 1));

  if (dateKey === today) {
    return t('common.today');
  }
  if (dateKey === tomorrow) {
    return t('common.tomorrow');
  }

  const date = fromDateKey(dateKey);
  return formatDateLocale(date, locale);
}
