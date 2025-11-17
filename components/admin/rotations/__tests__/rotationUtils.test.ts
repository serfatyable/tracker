import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import { formatDateLabel, getRotationName, toDate } from '../rotationUtils';

import type { Rotation } from '@/types/rotations';

describe('rotationUtils', () => {
  describe('getRotationName', () => {
    const mockRotation: Rotation = {
      id: 'rot-1',
      name: 'Fallback Name',
      name_en: 'English Name',
      name_he: 'שם בעברית',
      startDate: Timestamp.now(),
      endDate: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    describe('English language', () => {
      it('should return English name when language is "en"', () => {
        const result = getRotationName(mockRotation, 'en');
        expect(result).toBe('English Name');
      });

      it('should fallback to name field if name_en is missing', () => {
        const rotation = { ...mockRotation, name_en: undefined };
        const result = getRotationName(rotation, 'en');
        expect(result).toBe('Fallback Name');
      });

      it('should use name_en even if name is present', () => {
        const result = getRotationName(mockRotation, 'en');
        expect(result).toBe('English Name');
        expect(result).not.toBe('Fallback Name');
      });
    });

    describe('Hebrew language', () => {
      it('should return Hebrew name when language is "he"', () => {
        const result = getRotationName(mockRotation, 'he');
        expect(result).toBe('שם בעברית');
      });

      it('should fallback to name_en if name_he is missing', () => {
        const rotation = { ...mockRotation, name_he: undefined };
        const result = getRotationName(rotation, 'he');
        expect(result).toBe('English Name');
      });

      it('should fallback to name if both name_he and name_en are missing', () => {
        const rotation = {
          ...mockRotation,
          name_he: undefined,
          name_en: undefined,
        };
        const result = getRotationName(rotation, 'he');
        expect(result).toBe('Fallback Name');
      });

      it('should prefer name_he over name_en when available', () => {
        const result = getRotationName(mockRotation, 'he');
        expect(result).toBe('שם בעברית');
        expect(result).not.toBe('English Name');
      });
    });

    describe('edge cases', () => {
      it('should handle empty name_he by falling back to name_en', () => {
        const rotation = { ...mockRotation, name_he: '' };
        const result = getRotationName(rotation, 'he');
        // Empty string is falsy, should fallback
        expect(result).toBe('English Name');
      });

      it('should handle other languages by defaulting to English behavior', () => {
        const result = getRotationName(mockRotation, 'fr');
        expect(result).toBe('English Name');
      });

      it('should handle rotation with only name field', () => {
        const rotation: Rotation = {
          id: 'rot-2',
          name: 'Only Name',
          startDate: Timestamp.now(),
          endDate: Timestamp.now(),
          createdAt: Timestamp.now(),
        };
        expect(getRotationName(rotation, 'en')).toBe('Only Name');
        expect(getRotationName(rotation, 'he')).toBe('Only Name');
      });
    });
  });

  describe('toDate', () => {
    describe('Date object conversion', () => {
      it('should return Date object as-is', () => {
        const date = new Date('2025-11-16');
        const result = toDate(date);
        expect(result).toBe(date);
        expect(result).toBeInstanceOf(Date);
      });

      it('should preserve time information', () => {
        const date = new Date('2025-11-16T14:30:00Z');
        const result = toDate(date);
        expect(result?.getTime()).toBe(date.getTime());
      });
    });

    describe('Firestore Timestamp conversion', () => {
      it('should convert Firestore Timestamp to Date', () => {
        const timestamp = Timestamp.fromDate(new Date('2025-11-16T10:00:00Z'));
        const result = toDate(timestamp);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBe(timestamp.toDate().getTime());
      });

      it('should handle Timestamp.now()', () => {
        const timestamp = Timestamp.now();
        const result = toDate(timestamp);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBeCloseTo(Date.now(), -2); // Within 100ms
      });

      it('should call toDate() method on Timestamp-like objects', () => {
        const mockTimestamp = {
          toDate: () => new Date('2025-11-16'),
        };
        const result = toDate(mockTimestamp);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2025);
      });
    });

    describe('string conversion', () => {
      it('should convert ISO date string to Date', () => {
        const result = toDate('2025-11-16');
        expect(result).toBeInstanceOf(Date);
        expect(result?.getFullYear()).toBe(2025);
        expect(result?.getMonth()).toBe(10); // November (0-indexed)
        expect(result?.getDate()).toBe(16);
      });

      it('should convert ISO datetime string to Date', () => {
        const result = toDate('2025-11-16T14:30:00Z');
        expect(result).toBeInstanceOf(Date);
        expect(result?.getHours()).toBeGreaterThanOrEqual(0);
      });

      it('should handle various date string formats', () => {
        const formats = ['2025-11-16', '11/16/2025', 'November 16, 2025', '2025-11-16T10:00:00'];
        formats.forEach((format) => {
          const result = toDate(format);
          expect(result).toBeInstanceOf(Date);
          expect(result?.getTime()).not.toBeNaN();
        });
      });
    });

    describe('null and invalid values', () => {
      it('should return null for null input', () => {
        const result = toDate(null);
        expect(result).toBeNull();
      });

      it('should return null for undefined input', () => {
        const result = toDate(undefined);
        expect(result).toBeNull();
      });

      it('should return null for empty string', () => {
        const result = toDate('');
        expect(result).toBeNull();
      });

      it('should return null for invalid date string', () => {
        const result = toDate('invalid-date');
        expect(result).toBeNull();
      });

      it('should return null for NaN', () => {
        const result = toDate(NaN);
        expect(result).toBeNull();
      });

      it('should return null for non-date objects', () => {
        const result = toDate({ foo: 'bar' });
        expect(result).toBeNull();
      });
    });

    describe('edge cases', () => {
      it('should return null for zero (treated as falsy)', () => {
        // Note: 0 is technically a valid timestamp (Unix epoch)
        // but the implementation treats it as falsy
        const result = toDate(0);
        expect(result).toBeNull();
      });

      it('should handle negative timestamps', () => {
        const result = toDate(-1000);
        expect(result).toBeInstanceOf(Date);
        expect(result?.getTime()).toBe(-1000);
      });

      it('should handle very large timestamps', () => {
        const largeTimestamp = 8640000000000000; // Max safe timestamp
        const result = toDate(largeTimestamp);
        expect(result).toBeInstanceOf(Date);
      });
    });
  });

  describe('formatDateLabel', () => {
    describe('English locale', () => {
      it('should format date in English locale', () => {
        const date = new Date('2025-11-16');
        const result = formatDateLabel(date, 'en-US');
        expect(result).toContain('Nov');
        expect(result).toContain('16');
        expect(result).toContain('2025');
      });

      it('should use medium date style', () => {
        const date = new Date('2025-11-16');
        const result = formatDateLabel(date, 'en-US');
        // Medium style typically includes abbreviated month
        expect(result).toMatch(/\w{3}/); // Three-letter month abbreviation
      });

      it('should handle different dates correctly', () => {
        const dates = [new Date('2025-01-01'), new Date('2025-06-15'), new Date('2025-12-31')];
        dates.forEach((date) => {
          const result = formatDateLabel(date, 'en-US');
          expect(result).toBeTruthy();
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });

    describe('Hebrew locale', () => {
      it('should format date in Hebrew locale', () => {
        const date = new Date('2025-11-16');
        const result = formatDateLabel(date, 'he-IL');
        expect(result).toBeTruthy();
        expect(result).toContain('2025');
      });

      it('should produce different output than English', () => {
        const date = new Date('2025-11-16');
        const enResult = formatDateLabel(date, 'en-US');
        const heResult = formatDateLabel(date, 'he-IL');
        // Hebrew and English formats should differ
        expect(heResult).not.toBe(enResult);
      });

      it('should handle Hebrew locale variations', () => {
        const date = new Date('2025-11-16');
        const result1 = formatDateLabel(date, 'he');
        const result2 = formatDateLabel(date, 'he-IL');
        expect(result1).toBeTruthy();
        expect(result2).toBeTruthy();
      });
    });

    describe('null handling', () => {
      it('should return empty string for null date', () => {
        const result = formatDateLabel(null, 'en-US');
        expect(result).toBe('');
      });

      it('should return empty string for null date in Hebrew', () => {
        const result = formatDateLabel(null, 'he-IL');
        expect(result).toBe('');
      });

      it('should return empty string for null date with any locale', () => {
        const locales = ['en-US', 'he-IL', 'fr-FR', 'de-DE'];
        locales.forEach((locale) => {
          const result = formatDateLabel(null, locale);
          expect(result).toBe('');
        });
      });
    });

    describe('edge cases', () => {
      it('should handle leap year dates', () => {
        const date = new Date('2024-02-29'); // Leap year
        const result = formatDateLabel(date, 'en-US');
        expect(result).toContain('29');
        expect(result).toContain('Feb');
      });

      it('should handle year boundaries', () => {
        const dates = [new Date('2025-01-01'), new Date('2025-12-31')];
        dates.forEach((date) => {
          const result = formatDateLabel(date, 'en-US');
          expect(result).toBeTruthy();
        });
      });

      it('should handle very old dates', () => {
        const date = new Date('1900-01-01');
        const result = formatDateLabel(date, 'en-US');
        expect(result).toContain('1900');
      });

      it('should handle far future dates', () => {
        const date = new Date('2100-12-31');
        const result = formatDateLabel(date, 'en-US');
        expect(result).toContain('2100');
      });

      it('should handle different locale formats', () => {
        const date = new Date('2025-11-16');
        const locales = ['en-US', 'en-GB', 'he-IL', 'fr-FR'];
        locales.forEach((locale) => {
          const result = formatDateLabel(date, locale);
          expect(result).toBeTruthy();
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
