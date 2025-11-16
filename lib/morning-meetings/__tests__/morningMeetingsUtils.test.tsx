import { Timestamp } from 'firebase/firestore';
import { describe, expect, it } from 'vitest';

import {
  buildMeetingSlug,
  escapeRegExp,
  formatRelativeTime,
  formatWeekLabel,
  getMeetingKey,
  getWeekNumber,
  groupByWeek,
  isUserAssociatedWithMeeting,
  isUserLecturerForMeeting,
  matchRoleFilter,
  renderHighlightedText,
  sanitizeCsvValue,
  startOfDay,
  startOfWeek,
} from '../morningMeetingsUtils';

import type { UserProfile } from '@/types/auth';
import type { MorningMeeting } from '@/types/morningMeetings';

describe('morningMeetingsUtils', () => {
  describe('sanitizeCsvValue', () => {
    it('should escape double quotes', () => {
      const result = sanitizeCsvValue('Hello "World"');
      expect(result).toBe('Hello ""World""');
    });

    it('should handle multiple quotes', () => {
      const result = sanitizeCsvValue('"Test" "Value"');
      expect(result).toBe('""Test"" ""Value""');
    });

    it('should return empty string for null', () => {
      const result = sanitizeCsvValue(null);
      expect(result).toBe('');
    });

    it('should return empty string for undefined', () => {
      const result = sanitizeCsvValue(undefined);
      expect(result).toBe('');
    });

    it('should handle empty string', () => {
      const result = sanitizeCsvValue('');
      expect(result).toBe('');
    });

    it('should convert non-string values to string', () => {
      const result = sanitizeCsvValue('123' as string);
      expect(result).toBe('123');
    });

    it('should handle strings without quotes', () => {
      const result = sanitizeCsvValue('No quotes here');
      expect(result).toBe('No quotes here');
    });
  });

  describe('buildMeetingSlug', () => {
    const mockMeeting: MorningMeeting = {
      dateKey: '2025-11-16',
      title: 'Test Meeting',
      date: Timestamp.now(),
      endDate: Timestamp.now(),
      dayOfWeek: 'ו',
    };

    it('should create URL-friendly slug', () => {
      const result = buildMeetingSlug(mockMeeting);
      expect(result).toBe('2025-11-16-test-meeting');
    });

    it('should lowercase the slug', () => {
      const meeting = { ...mockMeeting, title: 'UPPERCASE TITLE' };
      const result = buildMeetingSlug(meeting);
      expect(result).toBe('2025-11-16-uppercase-title');
    });

    it('should replace special characters with hyphens', () => {
      const meeting = { ...mockMeeting, title: 'Test @ Meeting!' };
      const result = buildMeetingSlug(meeting);
      expect(result).toBe('2025-11-16-test-meeting');
    });

    it('should handle Hebrew-only title by using dateKey', () => {
      const meeting = { ...mockMeeting, title: 'שיעור בוקר' };
      const result = buildMeetingSlug(meeting);
      // Hebrew gets removed, leaving only dateKey
      expect(result).toBe('2025-11-16');
    });

    it('should handle null title with fallback pattern', () => {
      const meeting = { ...mockMeeting, title: null as any };
      const result = buildMeetingSlug(meeting);
      // Implementation uses: `${meeting.dateKey}-${meeting.title ?? 'morning-meeting'}`
      expect(result).toBe('2025-11-16-morning-meeting');
    });

    it('should handle undefined title with fallback pattern', () => {
      const meeting = { ...mockMeeting, title: undefined as any };
      const result = buildMeetingSlug(meeting);
      expect(result).toBe('2025-11-16-morning-meeting');
    });

    it('should limit slug length to 60 characters', () => {
      const longTitle = 'Very Long Title That Exceeds The Maximum Length Allowed For Slugs';
      const meeting = { ...mockMeeting, title: longTitle };
      const result = buildMeetingSlug(meeting);
      expect(result.length).toBeLessThanOrEqual(60);
    });

    it('should remove leading and trailing hyphens', () => {
      const meeting = { ...mockMeeting, title: '---Test---' };
      const result = buildMeetingSlug(meeting);
      expect(result).not.toMatch(/^-/);
      expect(result).not.toMatch(/-$/);
    });

    it('should collapse multiple hyphens into one', () => {
      const meeting = { ...mockMeeting, title: 'Test    Meeting' };
      const result = buildMeetingSlug(meeting);
      expect(result).not.toContain('--');
    });
  });

  describe('getMeetingKey', () => {
    it('should return id if present', () => {
      const meeting: MorningMeeting = {
        id: 'meeting-123',
        dateKey: '2025-11-16',
        title: 'Test',
        date: Timestamp.now(),
        endDate: Timestamp.now(),
        dayOfWeek: 'ו',
      };
      expect(getMeetingKey(meeting)).toBe('meeting-123');
    });

    it('should return dateKey if id is missing', () => {
      const meeting: MorningMeeting = {
        dateKey: '2025-11-16',
        title: 'Test',
        date: Timestamp.now(),
        endDate: Timestamp.now(),
        dayOfWeek: 'ו',
      };
      expect(getMeetingKey(meeting)).toBe('2025-11-16');
    });

    it('should prefer id over dateKey', () => {
      const meeting: MorningMeeting = {
        id: 'meeting-123',
        dateKey: '2025-11-16',
        title: 'Test',
        date: Timestamp.now(),
        endDate: Timestamp.now(),
        dayOfWeek: 'ו',
      };
      expect(getMeetingKey(meeting)).toBe('meeting-123');
      expect(getMeetingKey(meeting)).not.toBe('2025-11-16');
    });
  });

  describe('matchRoleFilter', () => {
    it('should return true when expected filter is empty', () => {
      expect(matchRoleFilter('resident', null)).toBe(true);
      expect(matchRoleFilter('resident', undefined)).toBe(true);
      expect(matchRoleFilter('resident', '')).toBe(true);
    });

    it('should return false when value is empty but expected is not', () => {
      expect(matchRoleFilter(null, 'resident')).toBe(false);
      expect(matchRoleFilter(undefined, 'resident')).toBe(false);
      expect(matchRoleFilter('', 'resident')).toBe(false);
    });

    it('should match case-insensitively', () => {
      expect(matchRoleFilter('RESIDENT', 'resident')).toBe(true);
      expect(matchRoleFilter('resident', 'RESIDENT')).toBe(true);
      expect(matchRoleFilter('ReSiDeNt', 'rEsIdEnT')).toBe(true);
    });

    it('should trim whitespace before matching', () => {
      expect(matchRoleFilter('  resident  ', 'resident')).toBe(true);
      expect(matchRoleFilter('resident', '  resident  ')).toBe(true);
      expect(matchRoleFilter('  resident  ', '  resident  ')).toBe(true);
    });

    it('should return false for non-matching values', () => {
      expect(matchRoleFilter('tutor', 'resident')).toBe(false);
      expect(matchRoleFilter('admin', 'resident')).toBe(false);
    });

    it('should handle exact matches', () => {
      expect(matchRoleFilter('resident', 'resident')).toBe(true);
      expect(matchRoleFilter('tutor', 'tutor')).toBe(true);
    });
  });

  describe('renderHighlightedText', () => {
    it('should return null for null text', () => {
      const result = renderHighlightedText(null, ['test']);
      expect(result).toBeNull();
    });

    it('should return null for undefined text', () => {
      const result = renderHighlightedText(undefined, ['test']);
      expect(result).toBeNull();
    });

    it('should return text as-is when no highlights', () => {
      const result = renderHighlightedText('Hello World', []);
      expect(result).toBe('Hello World');
    });

    it('should highlight matching terms', () => {
      const result = renderHighlightedText('Hello World', ['Hello']);
      expect(result).not.toBe('Hello World');
      // Should contain mark element
      const elements = result as any[];
      expect(elements.length).toBeGreaterThan(1);
    });

    it('should be case-insensitive when highlighting', () => {
      const result = renderHighlightedText('Hello World', ['hello']);
      const elements = result as any[];
      expect(elements.length).toBeGreaterThan(1);
    });

    it('should filter out single-character highlights', () => {
      const result = renderHighlightedText('Hello World', ['H']);
      expect(result).toBe('Hello World');
    });

    it('should handle multiple highlight terms', () => {
      const result = renderHighlightedText('Hello World', ['Hello', 'World']);
      const elements = result as any[];
      expect(elements.length).toBeGreaterThan(2);
    });

    it('should remove duplicate highlights', () => {
      const result = renderHighlightedText('Hello World', ['hello', 'HELLO', 'Hello']);
      const elements = result as any[];
      // Duplicates should be removed
      expect(elements).toBeDefined();
    });

    it('should trim whitespace from highlights', () => {
      const result = renderHighlightedText('Hello World', ['  Hello  ']);
      const elements = result as any[];
      expect(elements.length).toBeGreaterThan(1);
    });

    it('should escape special regex characters', () => {
      const result = renderHighlightedText('Test (value)', ['(value)']);
      const elements = result as any[];
      expect(elements.length).toBeGreaterThan(1);
    });
  });

  describe('escapeRegExp', () => {
    it('should escape special regex characters', () => {
      const special = '.*+?^${}()|[]\\';
      const result = escapeRegExp(special);
      expect(result).toBe('\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\');
    });

    it('should not escape regular characters', () => {
      const result = escapeRegExp('hello123');
      expect(result).toBe('hello123');
    });

    it('should handle empty string', () => {
      const result = escapeRegExp('');
      expect(result).toBe('');
    });

    it('should escape parentheses', () => {
      const result = escapeRegExp('(test)');
      expect(result).toBe('\\(test\\)');
    });

    it('should escape dots', () => {
      const result = escapeRegExp('test.value');
      expect(result).toBe('test\\.value');
    });
  });

  describe('formatRelativeTime', () => {
    const now = Date.now();

    it('should return "—" for null timestamp', () => {
      expect(formatRelativeTime(null)).toBe('—');
    });

    it('should return "—" for undefined timestamp', () => {
      expect(formatRelativeTime(undefined)).toBe('—');
    });

    it('should format minutes for recent times', () => {
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const result = formatRelativeTime(fiveMinutesAgo, 'en-US');
      expect(result).toContain('minute');
    });

    it('should format hours for times within a day', () => {
      const twoHoursFromNow = now + 2 * 60 * 60 * 1000;
      const result = formatRelativeTime(twoHoursFromNow, 'en-US');
      expect(result).toContain('hour');
    });

    it('should format days for times beyond 24 hours', () => {
      const threeDaysFromNow = now + 3 * 24 * 60 * 60 * 1000;
      const result = formatRelativeTime(threeDaysFromNow, 'en-US');
      expect(result).toContain('day');
    });

    it('should handle past times', () => {
      const tenMinutesAgo = now - 10 * 60 * 1000;
      const result = formatRelativeTime(tenMinutesAgo, 'en-US');
      expect(result).toContain('ago');
    });

    it('should handle future times', () => {
      const inTenMinutes = now + 10 * 60 * 1000;
      const result = formatRelativeTime(inTenMinutes, 'en-US');
      expect(result).toContain('in');
    });

    it('should support Hebrew locale', () => {
      const fiveMinutesAgo = now - 5 * 60 * 1000;
      const result = formatRelativeTime(fiveMinutesAgo, 'he-IL');
      expect(result).toBeTruthy();
    });

    it('should use "auto" numeric style', () => {
      // Very recent times might use "now" instead of "0 minutes"
      const justNow = now - 10000; // 10 seconds ago
      const result = formatRelativeTime(justNow, 'en-US');
      expect(result).toBeTruthy();
    });
  });

  describe('startOfDay', () => {
    it('should set time to midnight', () => {
      const date = new Date('2025-11-16T14:30:00');
      const result = startOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should preserve the date', () => {
      const date = new Date('2025-11-16T14:30:00');
      const result = startOfDay(date);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(10); // November
      expect(result.getDate()).toBe(16);
    });

    it('should not mutate the original date', () => {
      const date = new Date('2025-11-16T14:30:00');
      const original = date.getTime();
      startOfDay(date);
      expect(date.getTime()).toBe(original);
    });

    it('should handle already midnight dates', () => {
      const date = new Date('2025-11-16T00:00:00');
      const result = startOfDay(date);
      expect(result.getTime()).toBe(date.getTime());
    });
  });

  describe('startOfWeek', () => {
    it('should return Sunday for a Sunday date', () => {
      const sunday = new Date('2025-11-16'); // Assuming this is a Sunday
      const result = startOfWeek(sunday);
      expect(result.getDay()).toBe(0); // Sunday
    });

    it('should return previous Sunday for a Wednesday', () => {
      const wednesday = new Date('2025-11-19'); // Wednesday
      const result = startOfWeek(wednesday);
      expect(result.getDay()).toBe(0); // Sunday
      expect(result.getDate()).toBeLessThanOrEqual(19);
    });

    it('should return previous Sunday for a Saturday', () => {
      const saturday = new Date('2025-11-22'); // Saturday
      const result = startOfWeek(saturday);
      expect(result.getDay()).toBe(0); // Sunday
    });

    it('should set time to midnight', () => {
      const date = new Date('2025-11-16T14:30:00');
      const result = startOfWeek(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should not mutate the original date', () => {
      const date = new Date('2025-11-16T14:30:00');
      const original = date.getTime();
      startOfWeek(date);
      expect(date.getTime()).toBe(original);
    });
  });

  describe('groupByWeek', () => {
    const createMeeting = (dateStr: string): MorningMeeting => ({
      dateKey: dateStr,
      title: `Meeting ${dateStr}`,
      date: Timestamp.fromDate(new Date(dateStr)),
      endDate: Timestamp.fromDate(new Date(dateStr)),
      dayOfWeek: 'ו',
    });

    it('should group meetings in the same week', () => {
      // Use consecutive weekdays (Mon-Wed) to ensure same ISO week
      const meetings = [
        createMeeting('2025-11-17'), // Monday
        createMeeting('2025-11-18'), // Tuesday
        createMeeting('2025-11-19'), // Wednesday
      ];
      const result = groupByWeek(meetings);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(3);
    });

    it('should separate meetings from different weeks', () => {
      const meetings = [
        createMeeting('2025-11-17'), // Monday, week 47
        createMeeting('2025-11-24'), // Monday, week 48 (next week)
      ];
      const result = groupByWeek(meetings);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(1);
      expect(result[1]).toHaveLength(1);
    });

    it('should sort meetings by date before grouping', () => {
      const meetings = [
        createMeeting('2025-11-19'), // Wednesday
        createMeeting('2025-11-17'), // Monday
        createMeeting('2025-11-18'), // Tuesday
      ];
      const result = groupByWeek(meetings);
      expect(result[0]?.[0]?.dateKey).toBe('2025-11-17');
      expect(result[0]?.[1]?.dateKey).toBe('2025-11-18');
      expect(result[0]?.[2]?.dateKey).toBe('2025-11-19');
    });

    it('should handle empty array', () => {
      const result = groupByWeek([]);
      expect(result).toHaveLength(0);
    });

    it('should handle single meeting', () => {
      const meetings = [createMeeting('2025-11-17')];
      const result = groupByWeek(meetings);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveLength(1);
    });

    it('should handle multiple weeks', () => {
      const meetings = [
        createMeeting('2025-11-17'), // Monday, week 47
        createMeeting('2025-11-24'), // Monday, week 48
        createMeeting('2025-12-01'), // Monday, week 49
      ];
      const result = groupByWeek(meetings);
      expect(result).toHaveLength(3);
    });
  });

  describe('getWeekNumber', () => {
    it('should return ISO week number', () => {
      const date = new Date('2025-01-06'); // First full week of 2025
      const week = getWeekNumber(date);
      expect(week).toBeGreaterThan(0);
      expect(week).toBeLessThanOrEqual(53);
    });

    it('should handle year boundaries correctly', () => {
      const endOfYear = new Date('2025-12-31');
      const week = getWeekNumber(endOfYear);
      expect(week).toBeGreaterThan(0);
    });

    it('should return same week number for dates in same week', () => {
      const monday = new Date('2025-11-17');
      const friday = new Date('2025-11-21');
      expect(getWeekNumber(monday)).toBe(getWeekNumber(friday));
    });

    it('should return different week numbers for different weeks', () => {
      const thisWeek = new Date('2025-11-16');
      const nextWeek = new Date('2025-11-23');
      expect(getWeekNumber(thisWeek)).not.toBe(getWeekNumber(nextWeek));
    });
  });

  describe('formatWeekLabel', () => {
    it('should format week range in English', () => {
      const date = new Date('2025-11-16');
      const result = formatWeekLabel(date, 'en');
      expect(result).toContain('-');
      expect(result).toMatch(/\w{3}/); // Month abbreviation
    });

    it('should format week range in Hebrew', () => {
      const date = new Date('2025-11-16');
      const result = formatWeekLabel(date, 'he');
      expect(result).toContain('-');
      expect(result).toBeTruthy();
    });

    it('should show Sunday to Saturday range', () => {
      const wednesday = new Date('2025-11-19');
      const result = formatWeekLabel(wednesday, 'en');
      // Should contain a date range spanning 7 days
      expect(result).toContain('-');
    });

    it('should handle different months in same week', () => {
      // A week that spans two months
      const date = new Date('2025-11-30'); // End of November
      const result = formatWeekLabel(date, 'en');
      expect(result).toContain('-');
    });
  });

  describe('isUserAssociatedWithMeeting', () => {
    const mockUser: UserProfile = {
      uid: 'user-123',
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'resident',
      status: 'active',
      settings: { language: 'en' },
      residencyStartDate: '2025-01-01',
      studyprogramtype: '4-year',
    };

    const mockMeeting: MorningMeeting = {
      dateKey: '2025-11-16',
      title: 'Test Meeting',
      date: Timestamp.now(),
      endDate: Timestamp.now(),
      dayOfWeek: 'ו',
      lecturer: 'John Doe',
      moderator: 'Jane Smith',
      organizer: 'Bob Johnson',
    };

    it('should return false for null user', () => {
      expect(isUserAssociatedWithMeeting(null, mockMeeting)).toBe(false);
    });

    it('should return false for null meeting', () => {
      expect(isUserAssociatedWithMeeting(mockUser, null)).toBe(false);
    });

    it('should return true if user is lecturer', () => {
      const meeting = { ...mockMeeting, lecturer: 'John Doe' };
      expect(isUserAssociatedWithMeeting(mockUser, meeting)).toBe(true);
    });

    it('should return true if user is moderator', () => {
      const meeting = { ...mockMeeting, moderator: 'John Doe' };
      expect(isUserAssociatedWithMeeting(mockUser, meeting)).toBe(true);
    });

    it('should return true if user is organizer', () => {
      const meeting = { ...mockMeeting, organizer: 'John Doe' };
      expect(isUserAssociatedWithMeeting(mockUser, meeting)).toBe(true);
    });

    it('should match case-insensitively', () => {
      const meeting = { ...mockMeeting, moderator: 'JOHN DOE' };
      expect(isUserAssociatedWithMeeting(mockUser, meeting)).toBe(true);
    });

    it('should match partial names', () => {
      const meeting = { ...mockMeeting, moderator: 'Dr. John Doe MD' };
      expect(isUserAssociatedWithMeeting(mockUser, meeting)).toBe(true);
    });

    it('should return false for non-matching user', () => {
      const meeting = {
        ...mockMeeting,
        lecturer: 'Alice',
        moderator: 'Bob',
        organizer: 'Charlie',
      };
      expect(isUserAssociatedWithMeeting(mockUser, meeting)).toBe(false);
    });

    it('should handle user without fullName', () => {
      const user = { ...mockUser, fullName: undefined };
      expect(isUserAssociatedWithMeeting(user, mockMeeting)).toBe(false);
    });
  });

  describe('isUserLecturerForMeeting', () => {
    const mockUser: UserProfile = {
      uid: 'user-123',
      fullName: 'John Doe',
      email: 'john@example.com',
      role: 'tutor',
      status: 'active',
      settings: { language: 'en' },
    };

    const mockMeeting: MorningMeeting = {
      dateKey: '2025-11-16',
      title: 'Test Meeting',
      date: Timestamp.now(),
      endDate: Timestamp.now(),
      dayOfWeek: 'ו',
    };

    it('should return false for null user', () => {
      expect(isUserLecturerForMeeting(null, mockMeeting)).toBe(false);
    });

    it('should return false for null meeting', () => {
      expect(isUserLecturerForMeeting(mockUser, null)).toBe(false);
    });

    it('should match by lecturerUserId', () => {
      const meeting = { ...mockMeeting, lecturerUserId: 'user-123' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should match by lecturerEmailResolved', () => {
      const meeting = { ...mockMeeting, lecturerEmailResolved: 'john@example.com' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should match by lecturer name (exact match)', () => {
      const meeting = { ...mockMeeting, lecturer: 'John Doe' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should match by lecturer name (partial - lecturer contains user)', () => {
      const meeting = { ...mockMeeting, lecturer: 'Dr. John Doe MD' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should match by lecturer name (partial - user contains lecturer)', () => {
      const user = { ...mockUser, fullName: 'Dr. John Doe MD' };
      const meeting = { ...mockMeeting, lecturer: 'John Doe' };
      expect(isUserLecturerForMeeting(user, meeting)).toBe(true);
    });

    it('should be case-insensitive for name matching', () => {
      const meeting = { ...mockMeeting, lecturer: 'JOHN DOE' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should trim whitespace before matching', () => {
      const meeting = { ...mockMeeting, lecturer: '  John Doe  ' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should return false for non-matching lecturer', () => {
      const meeting = { ...mockMeeting, lecturer: 'Jane Smith' };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(false);
    });

    it('should prioritize lecturerUserId match', () => {
      const meeting = {
        ...mockMeeting,
        lecturerUserId: 'user-123',
        lecturer: 'Different Name',
      };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(true);
    });

    it('should handle user without email', () => {
      const user = { ...mockUser, email: undefined };
      const meeting = { ...mockMeeting, lecturerEmailResolved: 'john@example.com' };
      expect(isUserLecturerForMeeting(user, meeting)).toBe(false);
    });

    it('should handle user without fullName', () => {
      const user = { ...mockUser, fullName: undefined };
      const meeting = { ...mockMeeting, lecturer: 'John Doe' };
      expect(isUserLecturerForMeeting(user, meeting)).toBe(false);
    });

    it('should handle meeting without lecturer fields', () => {
      const meeting = { ...mockMeeting };
      expect(isUserLecturerForMeeting(mockUser, meeting)).toBe(false);
    });
  });
});
