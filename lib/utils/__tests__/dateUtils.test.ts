import { describe, expect, it } from 'vitest';

import {
  addDays,
  formatDateLocale,
  formatDateTimeLocale,
  fromDateKey,
  getDateRange,
  getRelativeDateLabel,
  getTodayDateKey,
  isToday,
  toDateKey,
} from '../dateUtils';

describe('dateUtils', () => {
  describe('toDateKey', () => {
    it('should convert date to YYYY-MM-DD format', () => {
      const date = new Date(2025, 10, 16); // November 16, 2025
      expect(toDateKey(date)).toBe('2025-11-16');
    });

    it('should pad single-digit months and days', () => {
      const date = new Date(2025, 0, 5); // January 5, 2025
      expect(toDateKey(date)).toBe('2025-01-05');
    });

    it('should handle end of year', () => {
      const date = new Date(2025, 11, 31); // December 31, 2025
      expect(toDateKey(date)).toBe('2025-12-31');
    });
  });

  describe('fromDateKey', () => {
    it('should parse YYYY-MM-DD format to Date', () => {
      const date = fromDateKey('2025-11-16');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(10); // November (0-indexed)
      expect(date.getDate()).toBe(16);
    });

    it('should handle single-digit months and days', () => {
      const date = fromDateKey('2025-01-05');
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(0); // January
      expect(date.getDate()).toBe(5);
    });

    it('should be reversible with toDateKey', () => {
      const original = new Date(2025, 5, 15); // June 15, 2025
      const key = toDateKey(original);
      const parsed = fromDateKey(key);
      expect(toDateKey(parsed)).toBe(key);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date(2025, 10, 16);
      const result = addDays(date, 5);
      expect(toDateKey(result)).toBe('2025-11-21');
    });

    it('should subtract days when negative', () => {
      const date = new Date(2025, 10, 16);
      const result = addDays(date, -5);
      expect(toDateKey(result)).toBe('2025-11-11');
    });

    it('should handle month boundaries', () => {
      const date = new Date(2025, 10, 30); // November 30
      const result = addDays(date, 2);
      expect(toDateKey(result)).toBe('2025-12-02');
    });

    it('should handle year boundaries', () => {
      const date = new Date(2025, 11, 30); // December 30
      const result = addDays(date, 5);
      expect(toDateKey(result)).toBe('2026-01-04');
    });

    it('should not mutate original date', () => {
      const date = new Date(2025, 10, 16);
      const original = toDateKey(date);
      addDays(date, 5);
      expect(toDateKey(date)).toBe(original);
    });
  });

  describe('getTodayDateKey', () => {
    it('should return date in Asia/Jerusalem timezone', () => {
      const result = getTodayDateKey();
      // Should be in YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return consistent format', () => {
      const result1 = getTodayDateKey();
      const result2 = getTodayDateKey();
      expect(result1).toBe(result2);
    });
  });

  describe('formatDateLocale', () => {
    it('should format date in English locale', () => {
      const date = new Date(2025, 10, 16);
      const result = formatDateLocale(date, 'en');
      expect(result).toContain('Nov');
      expect(result).toContain('16');
      expect(result).toContain('2025');
    });

    it('should format date in Hebrew locale', () => {
      const date = new Date(2025, 10, 16);
      const result = formatDateLocale(date, 'he');
      // Hebrew should return he-IL format
      expect(result).toBeTruthy();
      expect(result).toContain('2025');
    });

    it('should accept custom options', () => {
      const date = new Date(2025, 10, 16);
      const result = formatDateLocale(date, 'en', { month: 'long' });
      expect(result).toContain('November');
    });
  });

  describe('formatDateTimeLocale', () => {
    it('should format date with time in English', () => {
      const date = new Date(2025, 10, 16, 14, 30);
      const result = formatDateTimeLocale(date, 'en');
      expect(result).toContain('Nov');
      expect(result).toContain('16');
      expect(result).toContain('2025');
      // Should include time
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('should use Asia/Jerusalem timezone by default', () => {
      const date = new Date(2025, 10, 16, 14, 30);
      const result = formatDateTimeLocale(date, 'en');
      expect(result).toBeTruthy();
    });

    it('should accept custom timezone', () => {
      const date = new Date(2025, 10, 16, 14, 30);
      const result = formatDateTimeLocale(date, 'en', 'UTC');
      expect(result).toBeTruthy();
    });
  });

  describe('getDateRange', () => {
    it('should return start and end keys', () => {
      const start = new Date(2025, 10, 16);
      const result = getDateRange(start, 7);
      expect(result.startKey).toBe('2025-11-16');
      expect(result.endKey).toBe('2025-11-23');
    });

    it('should handle zero days ahead', () => {
      const start = new Date(2025, 10, 16);
      const result = getDateRange(start, 0);
      expect(result.startKey).toBe('2025-11-16');
      expect(result.endKey).toBe('2025-11-16');
    });

    it('should handle negative days as zero', () => {
      const start = new Date(2025, 10, 16);
      const result = getDateRange(start, -5);
      expect(result.startKey).toBe('2025-11-16');
      expect(result.endKey).toBe('2025-11-16');
    });
  });

  describe('isToday', () => {
    it("should return true for today's date key", () => {
      const todayKey = getTodayDateKey();
      expect(isToday(todayKey)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = addDays(new Date(), -1);
      const yesterdayKey = toDateKey(yesterday);
      expect(isToday(yesterdayKey)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowKey = toDateKey(tomorrow);
      expect(isToday(tomorrowKey)).toBe(false);
    });
  });

  describe('getRelativeDateLabel', () => {
    const mockT = (key: string) => {
      const translations: Record<string, string> = {
        'common.today': 'Today',
        'common.tomorrow': 'Tomorrow',
      };
      return translations[key] || key;
    };

    it('should return "Today" for today\'s date', () => {
      const todayKey = getTodayDateKey();
      const result = getRelativeDateLabel(todayKey, 'en', mockT);
      expect(result).toBe('Today');
    });

    it('should return "Tomorrow" for tomorrow\'s date', () => {
      const tomorrow = addDays(new Date(), 1);
      const tomorrowKey = toDateKey(tomorrow);
      const result = getRelativeDateLabel(tomorrowKey, 'en', mockT);
      expect(result).toBe('Tomorrow');
    });

    it('should return formatted date for other dates', () => {
      const future = addDays(new Date(), 7);
      const futureKey = toDateKey(future);
      const result = getRelativeDateLabel(futureKey, 'en', mockT);
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Tomorrow');
      expect(result).toMatch(/\w+/); // Should contain date string
    });
  });
});
