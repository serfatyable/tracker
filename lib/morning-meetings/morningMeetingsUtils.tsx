// Utility functions for morning meetings
// Date formatting, filtering, grouping, and text highlighting

import type { ReactNode } from 'react';

import type { UserProfile } from '../../types/auth';
import type { MorningMeeting } from '../../types/morningMeetings';

/**
 * Sanitize a value for CSV export by escaping quotes
 */
export function sanitizeCsvValue(value?: string | null): string {
  if (!value) return '';
  return String(value).replace(/"/g, '""');
}

/**
 * Build a URL-friendly slug from a meeting
 */
export function buildMeetingSlug(meeting: MorningMeeting): string {
  const base = `${meeting.dateKey}-${meeting.title ?? 'morning-meeting'}`;
  const normalized = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return normalized || `morning-meeting-${meeting.dateKey}`;
}

/**
 * Get a unique key for a meeting
 */
export function getMeetingKey(meeting: MorningMeeting): string {
  return meeting.id ?? meeting.dateKey;
}

/**
 * Check if a role value matches the expected filter
 */
export function matchRoleFilter(value?: string | null, expected?: string | null): boolean {
  if (!expected) return true;
  if (!value) return false;
  return value.trim().toLowerCase() === expected.trim().toLowerCase();
}

/**
 * Render text with highlighted search terms
 */
export function renderHighlightedText(
  text: string | null | undefined,
  highlights: string[],
): ReactNode {
  if (!text) return null;
  const uniqueHighlights = Array.from(
    new Set(highlights.map((term) => term.trim().toLowerCase()).filter((term) => term.length > 1)),
  );
  if (uniqueHighlights.length === 0) return text;
  const pattern = uniqueHighlights.map(escapeRegExp).join('|');
  if (!pattern) return text;
  const regex = new RegExp(`(${pattern})`, 'gi');
  const segments = text.split(regex);
  return segments.map((segment, index) => {
    if (!segment) return null;
    if (index % 2 === 1) {
      return (
        <mark
          key={`${segment}-${index}`}
          className="rounded bg-yellow-200 px-1 text-gray-900 dark:bg-yellow-400/40"
        >
          {segment}
        </mark>
      );
    }
    return <span key={`${segment}-${index}`}>{segment}</span>;
  });
}

/**
 * Escape special regex characters
 */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format a timestamp as relative time (e.g., "in 2 hours", "5 minutes ago")
 */
export function formatRelativeTime(timestamp?: number | null, locale: string = 'en-US'): string {
  if (!timestamp) return '—';
  const diff = timestamp - Date.now();
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.round(diff / (60 * 1000));
  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, 'minute');
  }
  const hours = Math.round(diff / (60 * 60 * 1000));
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, 'hour');
  }
  const days = Math.round(diff / (24 * 60 * 60 * 1000));
  return rtf.format(days, 'day');
}

/**
 * Get the start of the day (midnight)
 */
export function startOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Get the start of the week (Sunday)
 */
export function startOfWeek(date: Date): Date {
  const start = startOfDay(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
}

/**
 * Group meetings by week
 */
export function groupByWeek(meetings: MorningMeeting[]): MorningMeeting[][] {
  const weeks: MorningMeeting[][] = [];
  let currentWeek: MorningMeeting[] = [];
  let lastWeekNumber = -1;

  meetings
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())
    .forEach((meeting) => {
      const date = meeting.date.toDate();
      const weekNumber = getWeekNumber(date);

      if (weekNumber !== lastWeekNumber && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }

      currentWeek.push(meeting);
      lastWeekNumber = weekNumber;
    });

  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Get ISO week number for a date
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * Format a week range as "Jan 1 - Jan 7"
 */
export function formatWeekLabel(date: Date, language: string): string {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // End of week (Saturday)

  const formatter = (d: Date) =>
    d.toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });

  return `${formatter(start)} - ${formatter(end)}`;
}

/**
 * Check if a user is associated with a meeting (as lecturer, moderator, or organizer)
 */
export function isUserAssociatedWithMeeting(
  user: UserProfile | null,
  meeting: MorningMeeting | null,
): boolean {
  if (!user || !meeting) return false;
  if (isUserLecturerForMeeting(user, meeting)) return true;
  const normalizedUser = (user.fullName ?? '').trim().toLowerCase();
  if (!normalizedUser) return false;
  const matchable = [meeting.moderator, meeting.organizer];
  return matchable.some((value) => {
    if (!value) return false;
    return value.trim().toLowerCase().includes(normalizedUser);
  });
}

/**
 * Check if a user is the lecturer for a meeting
 */
export function isUserLecturerForMeeting(
  user: UserProfile | null,
  meeting: MorningMeeting | null,
): boolean {
  if (!user || !meeting) return false;

  if (meeting.lecturerUserId && meeting.lecturerUserId === user.uid) {
    return true;
  }

  if (user.email && meeting.lecturerEmailResolved && meeting.lecturerEmailResolved === user.email) {
    return true;
  }

  if (user.fullName && typeof meeting.lecturer === 'string') {
    const normalizedUser = user.fullName.trim().toLowerCase();
    const normalizedLecturer = meeting.lecturer.trim().toLowerCase();
    if (normalizedUser && normalizedLecturer) {
      if (
        normalizedUser === normalizedLecturer ||
        normalizedLecturer.includes(normalizedUser) ||
        normalizedUser.includes(normalizedLecturer)
      ) {
        return true;
      }
    }
  }

  return false;
}
